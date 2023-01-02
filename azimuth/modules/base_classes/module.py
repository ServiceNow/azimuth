# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import List, Optional, Set, cast

import numpy as np
from datasets import Dataset
from tqdm import tqdm

from azimuth.config import ModelContractConfig, PipelineDefinition
from azimuth.dataset_split_manager import DatasetSplitManager, PredictionTableKey
from azimuth.modules.base_classes import ArtifactManager, ConfigScope, DaskModule
from azimuth.types import DatasetColumn, DatasetSplitName, ModuleOptions, ModuleResponse
from azimuth.utils.conversion import md5_hash
from azimuth.utils.exclude_fields_with_extra import exclude_fields_with_extra
from azimuth.utils.validation import assert_not_none


class Module(DaskModule[ConfigScope]):
    """Abstract class to define functions used by all modules for computing results and interfacing
    with the dataset and the pipelines."""

    allowed_mod_options: Set[str] = set()

    def __init__(
        self,
        dataset_split_name: DatasetSplitName,
        config: ConfigScope,
        mod_options: Optional[ModuleOptions] = None,
    ):
        mod_options = mod_options or ModuleOptions()
        self.mod_options = mod_options
        if diff := (
            set(self.mod_options.no_alias_dict(exclude_defaults=True).keys())
            - self.allowed_mod_options
        ):
            raise ValueError(f"Unexpected mod_options {diff} for {self.__class__.__name__}.")

        self.model_contract_method_name = mod_options.model_contract_method_name
        self.task_name = self.model_contract_method_name or self.__class__.__name__
        super().__init__(dataset_split_name, config)

    def _get_name(self) -> str:
        # indices are excluded, since the cache for all indices should be in the same file.
        # model_contract_method_name are excluded too because it's already in the task_name.
        options_to_consider = self.mod_options.dict(
            exclude={"indices", "model_contract_method_name"}, include=self.allowed_mod_options
        )
        attributes_to_consider = self.config.dict(
            exclude=exclude_fields_with_extra(self.config, "exclude_from_cache"),
        )

        return (
            f"{self.task_name}_{self.dataset_split_name}"
            f"_{md5_hash(options_to_consider)[:5]}_{md5_hash(attributes_to_consider)[:5]}"
        )

    def get_caching_indices(self) -> List[int]:
        return self.mod_options.indices or self.get_indices()

    def get_indices(self, name: Optional[DatasetSplitName] = None) -> List[int]:
        """Get indices from dataset_split."""
        return cast(List[int], self.get_dataset_split(name)[DatasetColumn.row_idx])

    @property
    def artifact_manager(self):
        """This is set as a property so the Module always have access to the current version of
        the ArtifactManager on the worker."""
        return ArtifactManager.get_instance()

    @property
    def available_dataset_splits(self) -> Set[DatasetSplitName]:
        dataset_dict = self.artifact_manager.get_dataset_dict(self.config)
        return set(dataset_dict.keys()).intersection(
            [DatasetSplitName.eval, DatasetSplitName.train]
        )

    def compute_on_dataset_split(self) -> List[ModuleResponse]:
        """Method that iterates over a dataset_split and call `compute`"""
        ds: Dataset = self.get_dataset_split()
        batch_size = self.config.batch_size
        num_rows = list(range(len(ds)))
        batches = [num_rows[i : i + batch_size] for i in range(0, len(ds), batch_size)]

        result = []
        for batch in tqdm(
            batches,
            desc=f"{self.task_name} on {self.dataset_split_name} set "
            f"for pipeline {self.mod_options.pipeline_index}",
        ):
            result += self.compute(ds.select(batch))
        return result

    def compute(self, batch: Dataset) -> List[ModuleResponse]:
        raise NotImplementedError

    def get_full_dataset_split(self, name: Optional[DatasetSplitName] = None) -> Dataset:
        """Get the specified dataset_split without any filters/indices.

        Args:
            name: Which dataset_split to select.

        Returns:
            The loaded dataset_split.

        Raises:
            ValueError: If no dataset_split name is provided or defined in the module.

        """
        if self.dataset_split_name is None and name is None:
            raise ValueError(
                "No dataset_split_name defined for this module. Specify what dataset_split to get."
            )
        dataset_split_name = name or self.dataset_split_name
        dm = self.get_dataset_split_manager(dataset_split_name)
        dataset_split: Dataset = dm.get_dataset_split(self._get_table_key())
        return dataset_split

    def get_dataset_split(self, name: Optional[DatasetSplitName] = None) -> Dataset:
        """Get the specified dataset_split. For regular modules, not filtering or indexing is done.

        Args:
            name: Which dataset_split to get.

        Returns:
            The loaded dataset_split.

        """
        return self.get_full_dataset_split(name)

    def get_dataset_split_manager(
        self, name: Optional[DatasetSplitName] = None
    ) -> DatasetSplitManager:
        """
        Get the DatasetSplitManager object that the module is working with.

        Args:
            name: Which dataset_split to get DatasetSplitManager for.

        Returns:
            DatasetSplitManager instance.

        Raises:
            If there is no dataset defined in the config. Or if the split is not defined.

        """
        dataset_split_name = name or self.dataset_split_name
        dataset_split_manager: DatasetSplitManager = (
            self.artifact_manager.get_dataset_split_manager(self.config, dataset_split_name)
        )
        return dataset_split_manager

    def get_model(self):
        """Load the model according to the config and module options.

        This will invoke the Python method supplied in the config.
        See our API Doc for more details.

        Returns:
            Loaded model according to user spec.

        Raises:
            ValueError if no valid pipeline exists.
        """
        _ = self.get_current_pipeline()  # Validate current pipeline exists
        return self.artifact_manager.get_model(self.config, self.mod_options.pipeline_index)

    def _get_table_key(self) -> Optional[PredictionTableKey]:
        """Get the Table key for the current module.

        Returns:
            PredictionTableKey to use with DatasetSplitManager.
        """
        if self.mod_options.pipeline_index is None or not isinstance(
            self.config, ModelContractConfig
        ):
            return None
        current_pipeline = self.get_current_pipeline()
        use_bma = self.mod_options.use_bma
        table_key = PredictionTableKey(
            temperature=current_pipeline.temperature,
            threshold=self.get_threshold(),
            use_bma=use_bma,
            pipeline_index=self.mod_options.pipeline_index,
        )
        return table_key

    def get_threshold(self) -> Optional[float]:
        # The default is None so we have to handle it this way.
        current_pipeline = self.get_current_pipeline()

        thresh = self.mod_options.threshold
        if thresh is None:
            thresh = current_pipeline.threshold
        return thresh

    def get_current_pipeline(self) -> PipelineDefinition:
        """Get current pipeline for this spec.

        Returns:
            Config of the current pipeline.

        Raises:
            ValueError if no valid pipeline exists.
        """
        # TODO: Could use single dispatch instead?
        if not isinstance(self.config, ModelContractConfig):
            raise ValueError(
                "This Module does not have access to the pipeline"
                " as it does not use ModelContractScope."
            )
        if self.config.pipelines is None:
            raise ValueError("A model was not provided in the config.")
        if self.mod_options.pipeline_index is None:
            raise ValueError(
                f"`pipeline_index` is None, expected one"
                f" of {np.arange(len(self.config.pipelines))}"
            )
        pipelines = assert_not_none(self.config.pipelines)
        pipeline_index = assert_not_none(self.mod_options.pipeline_index)
        current_pipeline = pipelines[pipeline_index]
        return current_pipeline

    def clear_cache(self):
        self.artifact_manager.clear_cache()
