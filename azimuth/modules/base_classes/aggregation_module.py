# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
import time
from abc import ABC
from typing import List, Optional, cast

from datasets import Dataset

from azimuth.modules.base_classes import ConfigScope, ExpirableMixin, Module
from azimuth.types import DatasetColumn, DatasetSplitName, ModuleOptions, ModuleResponse
from azimuth.types.outcomes import OutcomeName
from azimuth.utils.filtering import filter_dataset_split


class AggregationModule(Module[ConfigScope], ABC):
    """Same as Module, but caching is done over a set of indices."""

    allowed_mod_options = {"pipeline_index"}

    def get_caching_indices(self) -> List[int]:
        return [-1]  # Aggregation Module cache on one index.

    def compute(self, batch: Dataset) -> List[ModuleResponse]:
        raise NotImplementedError("AggregationModule should not implement compute!")


class ComparisonModule(AggregationModule[ConfigScope], ABC):
    """Aggregation Module that works on dataset split all."""

    allowed_splits = {DatasetSplitName.all}


class FilterableModule(AggregationModule[ConfigScope], ExpirableMixin, ABC):
    """Filterable Module are affected by filters in mod options."""

    allowed_mod_options = {"filters", "pipeline_index", "without_postprocessing"}

    def __init__(
        self,
        dataset_split_name: DatasetSplitName,
        config: ConfigScope,
        mod_options: Optional[ModuleOptions] = None,
    ):
        super().__init__(dataset_split_name, config, mod_options=mod_options)
        self._time = time.time()

    def get_dataset_split(self, name: DatasetSplitName = None) -> Dataset:
        """Get the specified dataset_split, filtered according to mod_options.

        Args:
            name: Which dataset_split to get.

        Returns:
            The loaded dataset_split.

        """
        ds = super().get_dataset_split(name)
        return filter_dataset_split(ds, filters=self.mod_options.filters, config=self.config)

    def _get_predictions_from_ds(self) -> List[int]:
        """Get predicted classes according to the module options (with or without postprocessing).

        Returns: List of Predictions
        """
        ds = self.get_dataset_split()
        if self.mod_options.without_postprocessing:
            return cast(List[int], [preds[0] for preds in ds[DatasetColumn.model_predictions]])
        else:
            return cast(List[int], ds[DatasetColumn.postprocessed_prediction])

    def _get_confidences_from_ds(self) -> List[List[float]]:
        """Get confidences according to the module options (with or without postprocessing).

        Notes: Confidences are sorted according to their values (not the class id).

        Returns: List of Confidences
        """
        ds = self.get_dataset_split()
        confidences = (
            ds[DatasetColumn.model_confidences]
            if self.mod_options.without_postprocessing
            else ds[DatasetColumn.postprocessed_confidences]
        )
        return cast(List[List[float]], confidences)

    def _get_outcomes_from_ds(self) -> List[OutcomeName]:
        """Get outcomes according to the module options (with or without postprocessing).

        Returns: List of Outcomes
        """
        ds = self.get_dataset_split()
        outcomes = (
            ds[DatasetColumn.model_outcome]
            if self.mod_options.without_postprocessing
            else ds[DatasetColumn.postprocessed_outcome]
        )
        return cast(List[OutcomeName], outcomes)
