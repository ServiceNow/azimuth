# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import os
import pickle
import time
from collections import OrderedDict
from copy import deepcopy
from dataclasses import asdict, dataclass
from glob import glob
from os.path import join as pjoin
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union

import faiss
import numpy as np
import pandas as pd
import structlog
from datasets import ClassLabel, Dataset, concatenate_datasets
from filelock import FileLock

from azimuth.config import AzimuthConfig, AzimuthValidationError, CommonFieldsConfig
from azimuth.types.general.dataset import DatasetColumn, DatasetSplitName
from azimuth.types.tag import SmartTag, Tag
from azimuth.utils.validation import assert_not_none

log = structlog.get_logger("DatasetSplitManager")

FEATURES = "features"
FEATURE_FAISS = "features_faiss"


@dataclass(eq=True, frozen=True)  # Generates __hash__
class PredictionTableKey:
    threshold: Optional[float]
    temperature: Optional[float]
    use_bma: bool
    pipeline_index: Optional[int]
    pipeline_config_hash: str = ""

    @classmethod
    def from_pipeline_index(cls, index: int, config: AzimuthConfig, use_bma: bool = False):
        pipelines = assert_not_none(config.pipelines)
        return PredictionTableKey(
            threshold=pipelines[index].threshold,
            temperature=pipelines[index].temperature,
            use_bma=use_bma,
            pipeline_index=index,
        )


def to_class_name(class_idx, class_names):
    if isinstance(class_idx, Sequence):
        return [to_class_name(v, class_names) for v in class_idx]
    return class_names[class_idx]


class DatasetSplitManager:
    """Manage the dataset_split state, add/filter tags.

    Args:
        name: Name of the dataset_split, used in the filename.
        config: Application configuration.
        initial_tags: List of tags to initialize with.
        initial_prediction_tags: List of tags related to predictions.
        dataset_split: Dataset split to used, None if loading from cache. (The workers do that)
    """

    def __init__(
        self,
        name: DatasetSplitName,
        config: CommonFieldsConfig,
        initial_tags: List[str],
        initial_prediction_tags: Optional[List[str]] = None,
        dataset_split: Optional[Dataset] = None,
    ):
        self.name = name
        self._tags = initial_tags
        self._prediction_tags = initial_prediction_tags or []
        self.config = config
        self._artifact_path = config.get_artifact_path()
        self._hf_path = pjoin(self._artifact_path, "HF_datasets", self.name)
        self._base_dataset_path = pjoin(self._hf_path, "base_tables")
        os.makedirs(self._base_dataset_path, exist_ok=True)
        self._save_path = pjoin(self._base_dataset_path, "cache_ds.arrow")
        self._malformed_path = pjoin(self._base_dataset_path, "malformed_ds.arrow")
        self._index_path = pjoin(self._base_dataset_path, "index.faiss")
        self._features_path = pjoin(self._base_dataset_path, "features.faiss")
        self._file_lock = pjoin(self._hf_path, f"{name}.lock")
        self.last_update = -1
        # Load the dataset_split from disk.
        cached_dataset_split = self._load_dataset_split()
        if cached_dataset_split is None:
            if dataset_split is None:
                raise ValueError("No dataset_split cached, can't initialize.")
            log.info("Initializing tags", tags=initial_tags)
            self._base_dataset_split, self._malformed_dataset = self._split_malformed(dataset_split)
            self._base_dataset_split = self._init_dataset_split(
                self._base_dataset_split, self._tags
            )
            self._save_base_dataset_split()
        else:
            self._base_dataset_split, self._malformed_dataset = cached_dataset_split
        self._prediction_tables: Dict[PredictionTableKey, Dataset] = {}
        self._validate_columns()

    def get_dataset_split(self, table_key: Optional[PredictionTableKey] = None) -> Dataset:
        """Return a dataset_split concatenated with the config predictions.

        Args:
            table_key: Which pipeline to gather preds from.

        Returns:
            Dataset with predictions if available.
        """
        if table_key is None:
            return self._base_dataset_split
        return self.dataset_split_with_predictions(table_key=table_key)

    def dataset_split_with_predictions(self, table_key: PredictionTableKey) -> Dataset:
        """Return dataset_split concatenated with the prediction table for the specified values.

        Args:
            table_key: Key to the table.

        Returns:
            Dataset with predictions if possible.

        """
        prediction_table = self._get_prediction_table(table_key)
        ds: Dataset = concatenate_datasets([self._base_dataset_split, prediction_table], axis=1)
        return ds

    @property
    def num_rows(self):
        return len(self._base_dataset_split)

    @property
    def classification_columns(self):
        """Get columns that refer to classes in some way."""
        return {
            self.config.columns.label,
            DatasetColumn.model_predictions,
            DatasetColumn.postprocessed_prediction,
        }

    def _load_dataset_split(self) -> Optional[Tuple[Dataset, Dataset]]:
        if os.path.exists(self._save_path):
            log.debug("Reloading base dataset_split.", path=self._save_path)
            with FileLock(self._file_lock):
                ds = self.load_cache(self._save_path)
                malformed = self.load_cache(self._malformed_path)
            return ds, malformed
        return None

    def _save_base_dataset_split(self):
        # NOTE: We should not have the Index in `self.dataset_split`.
        with FileLock(self._file_lock):
            self._base_dataset_split.save_to_disk(self._get_new_version_path(self._save_path))
            self._malformed_dataset.save_to_disk(self._get_new_version_path(self._malformed_path))
        self.last_update = time.time()
        log.debug("Base dataset split saved.", path=self._save_path)

    def get_dataset_split_with_class_names(
        self, table_key: Optional[PredictionTableKey] = None
    ) -> Dataset:
        """Get a copy of the dataset_split, with class names instead of ids.

        Args:
            table_key: If provided, which pipeline predictions to return.

        Returns:
            Dataset with class indices replaces for their names.
        """
        # Not using self.dataset_split.features["label"].int2str() as it throws on -1,
        # which is possible in postprocessed_prediction
        # if a rejection class is missing from the classes.
        class_names = [
            *self.class_names,
            self.config.rejection_class or "REJECTION_CLASS",
        ]  # so class_names[-1] returns "REJECTION_CLASS"
        ds = self.get_dataset_split(table_key=table_key)
        col_names = ds.column_names
        class_columns = {c for c in self.classification_columns if c in col_names}
        ds_with_names: Dataset = ds.map(
            lambda r: {c: to_class_name(r[c], class_names) for c in class_columns}, batched=True
        )
        return ds_with_names

    def save_csv(self, table_key=None) -> str:
        """Save the dataset_split and return the path.

        Args:
            table_key: If provided, which prediction table to select.

        Returns:
            Local path to the csv.
        """
        log.info("Saving dataset_split as csv.", path=self._artifact_path)
        file_label = time.strftime("%Y%m%d_%H%M%S", time.localtime())
        pt = pjoin(
            self._artifact_path,
            f"azimuth_export_{self.config.name}_{self.name}_{file_label}.csv",
        )

        order = [
            DatasetColumn.row_idx,
            DatasetColumn.idx,
            self.config.columns.raw_text_input,
            self.config.columns.text_input,
            self.config.columns.label,
            DatasetColumn.model_predictions,
            DatasetColumn.postprocessed_prediction,
            DatasetColumn.model_confidences,
            DatasetColumn.postprocessed_confidences,
            DatasetColumn.confidence_bin_idx,
            DatasetColumn.outcome,
            DatasetColumn.token_count,
            DatasetColumn.neighbors_train,
            DatasetColumn.neighbors_eval,
            *self._tags,
        ]
        order = [c for c in order if c in self.get_dataset_split(table_key).column_names]

        # The following allows for new or extra columns to end up here automatically,
        # instead of being lost if we were to hardcode the whole list.
        omit = {*order, FEATURES, FEATURE_FAISS}
        rest = [c for c in self.get_dataset_split(table_key).column_names if c not in omit]

        columns = order + rest

        # pd.to_csv() instead of HF version to avoid unintended type conversions (list to array)
        df = pd.DataFrame(self.get_dataset_split_with_class_names(table_key)).reindex(
            columns=columns
        )
        df.to_csv(path_or_buf=pt, index=False)

        log.info("Dataset saved as CSV.", path=pt)
        return pt

    def _init_dataset_split(self, dataset_split: Dataset, tags) -> Dataset:
        dataset_split = dataset_split.map(lambda r: {k: False for k in tags})
        # Our own column that maps to the row index to preserve idx.
        dataset_split = dataset_split.map(
            lambda u, i: {DatasetColumn.row_idx: i}, with_indices=True
        )
        return dataset_split

    def _add_tags_to(
        self, ds: Dataset, tags: Union[Dict[int, Dict[Tag, bool]], Dict[int, Dict[SmartTag, bool]]]
    ):
        """Update tags to the specified dataset split.

        Args:
            tags: Tags where each key is an index and the values are Tags to be updated.

        """

        def check_tags(tags_dict):
            diff_key = set(tags_dict.keys()).difference(self._tags + self._prediction_tags)
            if len(diff_key) > 0:
                raise ValueError(f"Unknown tags: {diff_key}. Expected one of {self._tags}")
            return tags_dict

        ds = ds.map(lambda u, i: check_tags(tags.get(i, {})), with_indices=True, desc="Set Tag")
        self._save_base_dataset_split()
        return ds

    def add_tags(
        self,
        tags: Union[Dict[int, Dict[Tag, bool]], Dict[int, Dict[SmartTag, bool]]],
        table_key: Optional[PredictionTableKey] = None,
    ):
        """Add Tags to the dataset.

        Args:
            tags: Tags where each key is an index and the values are Tags to be updated.
            table_key: If tags are related to a table, which table is it.

        """
        base_tags = {
            k: {tag: value for tag, value in v.items() if tag in self._tags}
            for k, v in tags.items()
        }
        predict_tags = {
            k: {tag: value for tag, value in v.items() if tag in self._prediction_tags}
            for k, v in tags.items()
        }
        if (
            any(any(tag_values.values()) for tag_values in predict_tags.values())
            and table_key is None
        ):
            raise ValueError(f"No table key supplied for pipeline tags {predict_tags}.")

        # Find unknown tags
        unknown_tag = {
            k: {
                tag: value
                for tag, value in v.items()
                if tag not in self._prediction_tags + self._tags
            }
            for k, v in tags.items()
        }
        unknown_tag = {k: v for k, v in unknown_tag.items() if len(v) > 0}
        if len(unknown_tag) > 0:
            raise ValueError(f"Unknown   tags {unknown_tag}")

        # Process base tags
        base_tags_present = any(any(tag_values.values()) for tag_values in base_tags.values())
        if base_tags_present:
            self._base_dataset_split = self._add_tags_to(self._base_dataset_split, tags=base_tags)
            self._save_base_dataset_split()

        if table_key is not None:
            # Process prediction table
            non_null_table_key = assert_not_none(table_key)
            table = self._get_prediction_table(table_key=non_null_table_key)
            if table is None:
                raise ValueError("Can't save tag in an uninitialize dataset.")
            table = self._add_tags_to(table, tags=predict_tags)
            self._prediction_tables[non_null_table_key] = table
            self.save_prediction_table(non_null_table_key)

    def get_tags(
        self, indices: Optional[List[int]] = None, table_key: Optional[PredictionTableKey] = None
    ) -> List[Dict[str, bool]]:
        """Get tags from the dataset split.

        Args:
            indices: Set of indices to select.
            table_key: Predictions table to gather prediction tags.

        Returns:
            List of records per index.

        """
        if indices is not None and len(indices) > 0:
            ds = self.get_dataset_split(table_key).select(indices)
        else:
            ds = self.get_dataset_split(table_key)
        available_tags = self._tags if table_key is None else self._tags + self._prediction_tags
        df = pd.DataFrame({t: ds[t] for t in available_tags})
        tags: List[Dict[str, bool]] = df.to_dict(orient="records")
        return tags

    def class_distribution(self):
        """Compute the class distribution for a dataset_split.

        Returns:
            Array[int], count for each class.

        """
        class_distribution = np.unique(
            self._base_dataset_split[self.config.columns.label], return_counts=True
        )
        class_distribution_dict = dict(zip(class_distribution[0], class_distribution[1]))

        for x in range(self._base_dataset_split.features[self.config.columns.label].num_classes):
            if x not in class_distribution_dict:
                class_distribution_dict[x] = 0

        class_distribution_ordered = OrderedDict(sorted(class_distribution_dict.items()))
        return np.array(list(class_distribution_ordered.values()))

    def add_column(self, key, features, save=True, **kwargs):
        """Add a column to the base dataset_split.

        Notes:
            This doesn't fail if the column is already there compared to Dataset.add_column.

        Args:
            key: Name of the column
            features: List of features to set.
            save: Whether to hard save the dataset_split or not.
            kwargs: kwargs sent to Dataset.Map

        Raises:
            ValueError when length of features is not the number of rows.

        """
        if len(features) != self.num_rows:
            raise ValueError(
                f"Length mismatch, expected {self.num_rows} (`len(dataset)`), got {len(features)}."
            )
        self._base_dataset_split = self._base_dataset_split.map(
            lambda u, i: {key: features[i]}, with_indices=True, **kwargs, desc=f"Add column {key}"
        )
        if save:
            self._save_base_dataset_split()

    def add_faiss_index(self, features):
        """Add a FAISS index to the dataset_split.

        To get the dataset_split  with index, call `DatasetSplitManager.dataset_split_with_index`.

        Notes:
            We drop the index because you can't interact easily with a HF dataset that has an index.

        Args:
            features: Set of features to compute the index.

        """
        with FileLock(self._file_lock):
            # We take the lock because we are doing many manipulation to the dataset_split.
            self.add_column(FEATURES, features, save=False)
            self._base_dataset_split.add_faiss_index(
                FEATURES,
                index_name=FEATURE_FAISS,
                metric_type=faiss.METRIC_INNER_PRODUCT,
                string_factory="Flat",
            )
            self._base_dataset_split.save_faiss_index(FEATURE_FAISS, file=self._index_path)
            pickle.dump(self._base_dataset_split[FEATURES], open(self._features_path, "wb"))
            self._base_dataset_split.drop_index(FEATURE_FAISS)
            self._base_dataset_split = self._base_dataset_split.remove_columns(FEATURES)

    def dataset_split_with_index(self, table_key: Optional[PredictionTableKey] = None) -> Dataset:
        """
        Get the dataset split with the FAISS index loaded.

        Args:
            table_key: If provided, with return the dataset with the predictions.

        Returns:
            Dataset split with FEATURES_FAISS and FEATURES loaded.

        """
        ds: Dataset = deepcopy(self.get_dataset_split(table_key))
        # nosec - this is trusted data
        ds = ds.add_column(FEATURES, pickle.load(open(self._features_path, "rb")))  # nosec
        ds.load_faiss_index(FEATURE_FAISS, self._index_path)
        return ds

    @property
    def class_names(self):
        return self._base_dataset_split.features[self.config.columns.label].names

    @property
    def num_classes(self):
        return len(self.class_names)

    @property
    def rejection_class_idx(self):
        if self.config.rejection_class is None:
            # This is a dataset without a rejection class in the classes, like SST2.
            return -1
        if self.config.rejection_class not in self.class_names:
            raise AzimuthValidationError(
                f"Expected {self.config.rejection_class} in {self.class_names}."
                f" If your dataset does not have rejection class,"
                f" you can set `rejection_class=None` in the configuration."
                f" Otherwise set `rejection_class` to the class associated with no prediction."
            )
        return self.class_names.index(self.config.rejection_class)

    def _get_prediction_table(self, table_key: PredictionTableKey) -> Dataset:
        """Return the prediction table associated with `table_key`.

        Args:
            table_key: Key to the table.

        Returns:
            A table for this key, will create one if it doesn't exists.
        """

        path = self._prediction_path(table_key=table_key)
        if table_key not in self._prediction_tables and os.path.exists(path):
            with FileLock(self._file_lock):
                self._prediction_tables[table_key] = self.load_cache(path)
        elif table_key not in self._prediction_tables:
            empty_ds = Dataset.from_dict({"pred_row_idx": list(range(self.num_rows))})
            self._prediction_tables[table_key] = self._init_dataset_split(
                empty_ds, self._prediction_tags
            ).remove_columns([DatasetColumn.row_idx])
            self.save_prediction_table(table_key)
        return self._prediction_tables[table_key]

    def _prediction_path(self, table_key: PredictionTableKey):
        """Path to table file."""
        folder = pjoin(self._hf_path, "prediction_tables")
        table_name = "_".join(
            f"{k}={v:.2f}" if type(v) is float else f"{k}={v}" for k, v in asdict(table_key).items()
        )
        os.makedirs(folder, exist_ok=True)
        pt = pjoin(
            folder,
            f"{table_name}_cache_ds.arrow",
        )
        return pt

    def save_prediction_table(self, table_key: PredictionTableKey):
        """Save the prediction to disk."""
        with FileLock(self._file_lock):
            pt = self._prediction_path(table_key=table_key)
            self._prediction_tables[table_key].save_to_disk(self._get_new_version_path(pt))
        self.last_update = int(time.time())

    def add_column_to_prediction_table(
        self, key: str, features: List[Any], table_key: PredictionTableKey, **kwargs
    ):
        """
        Add a column to the prediction table.

        Notes:
            This doesnt fail if the column is already there compared to Dataset.add_column.

        Args:
            key: Name of the column
            features: List of features to set.
            table_key: Key to the prediction table.
            kwargs: kwargs sent to Dataset.Map

        Raises:
            ValueError if the features don't match the dataset length.

        """
        ds = self._get_prediction_table(table_key=table_key)
        if len(features) != len(ds):
            raise ValueError(
                f"Can't add a column of {len(features)} in a dataset of {len(ds)} rows."
            )
        ds = ds.map(
            lambda u, i: {key: features[i]},
            with_indices=True,
            **kwargs,
            desc=f"Add column {key}",
        )
        self._prediction_tables[table_key] = ds
        self.save_prediction_table(table_key)

    def _split_malformed(self, dataset: Dataset) -> Tuple[Dataset, Dataset]:
        # Split dataset between malformed and correctly formed.
        malformed = dataset.filter(
            lambda u: u.get(self.config.columns.failed_parsing_reason, "") != ""
        )
        dataset = dataset.filter(
            lambda u: u.get(self.config.columns.failed_parsing_reason, "") == ""
        )
        return dataset, malformed

    def _validate_columns(self):
        if diff := {self.config.columns.text_input, self.config.columns.label}.difference(
            self._base_dataset_split.column_names
        ):
            raise AzimuthValidationError(f"{' and '.join(diff)} missing from dataset {self.name}")
        if not isinstance(self._base_dataset_split.features[self.config.columns.label], ClassLabel):
            raise AzimuthValidationError(
                f"Expected column {self.config.columns.label}"
                f" to have type `datasets.ClassLabel`."
                f" You can call `Dataset.class_encode_column` to cast it automatically."
            )
        # Check that `rejection_class_idx` is valid.
        # It would throw an error if that wasn't the case.
        _ = self.rejection_class_idx
        if len(self._base_dataset_split) == 0:
            raise AzimuthValidationError(f"No rows found from dataset {self.name}")

    def load_cache(self, folder: str) -> Dataset:
        """
        Load the latest cache.

        Args:
            folder: Where to look for.

        Returns:
            The cached dataset or the original.

        Raises:
            FileNotFoundError if no cache found.
        """
        cache_file = next(
            iter(
                sorted(
                    glob(f"{folder}/version*.arrow"),
                    key=lambda file_path: float(file_path.split("_")[-1][:-6]),
                    reverse=True,
                )
            ),
            None,
        )
        if cache_file:
            log.debug(f"Loading latest cache: {cache_file.split('/')[-1]}")
            return Dataset.load_from_disk(cache_file)
        raise FileNotFoundError(f"No previously saved dataset in {folder}")

    def _get_new_version_path(self, directory):
        return pjoin(directory, f"version_{time.time()}.arrow")
