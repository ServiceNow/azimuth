# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
import time
from abc import ABC
from typing import List, Optional

from datasets import Dataset

from azimuth.modules.base_classes import ConfigScope, ExpirableMixin, Module
from azimuth.types import DatasetSplitName, ModuleOptions, ModuleResponse
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

    allowed_mod_options = {"filters", "pipeline_index"}

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
