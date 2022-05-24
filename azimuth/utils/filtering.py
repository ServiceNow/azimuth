# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
import abc
from functools import reduce
from typing import List, Optional, Type, TypeVar, Union

from datasets import Dataset

from azimuth.config import ProjectConfig
from azimuth.types import DatasetColumn, DatasetFilters, NamedDatasetFilters
from azimuth.types.tag import ALL_DATA_ACTIONS, ALL_SMART_TAGS, DataAction, SmartTag


def verify_column_is_present(column_name: str, dataset_split: Dataset):
    if column_name not in dataset_split.column_names:
        raise ValueError(f"{column_name} not in dataset_split's column names")


T = TypeVar("T", bound=DatasetFilters)


class FilterComponent:
    required_column: Optional[str]

    def __init__(self, config: ProjectConfig, without_postprocessing):
        self.config = config
        self.without_postprocessing = without_postprocessing

    @abc.abstractmethod
    def check_fn(self, filters: T) -> bool:
        """
        Check if this component is triggered by the current filters.
        """
        ...

    @abc.abstractmethod
    def filter_fn(self, item, filters: T) -> bool:
        """
        Determine if we keep `item` according to `filters`.

        NOTE: This is not called if `self.check_fn` returns False.
        """
        ...


class ConfidenceFilter(FilterComponent):
    @property
    def required_column(self):
        return (
            DatasetColumn.model_confidences
            if self.without_postprocessing
            else DatasetColumn.postprocessed_confidences
        )

    def check_fn(self, filters) -> bool:
        return bool(filters.confidence_min > 0 or filters.confidence_max < 1)

    def filter_fn(self, item, filters) -> bool:
        return bool(
            filters.confidence_min <= item[self.required_column][0] <= filters.confidence_max
        )


class LabelFilter(FilterComponent):
    @property
    def required_column(self):
        return self.config.columns.label

    def check_fn(self, filters) -> bool:
        return len(filters.labels) > 0

    def filter_fn(self, item, filters) -> bool:
        return item[self.required_column] in filters.labels


class UtteranceFilter(FilterComponent):
    @property
    def required_column(self):
        return self.config.columns.text_input

    def check_fn(self, filters) -> bool:
        return filters.utterance is not None

    def filter_fn(self, item, filters) -> bool:
        return filters.utterance.lower() in item[self.required_column].lower()


class PredictionFilter(FilterComponent):
    @property
    def required_column(self):
        return (
            DatasetColumn.model_predictions
            if self.without_postprocessing
            else DatasetColumn.postprocessed_prediction
        )

    def check_fn(self, filters) -> bool:
        return len(filters.predictions) > 0

    def filter_fn(self, item, filters) -> bool:
        if self.without_postprocessing:
            return item[self.required_column][0] in filters.predictions
        else:
            return item[self.required_column] in filters.predictions


class DataActionFilter(FilterComponent):
    @property
    def required_column(self):
        return None

    def check_fn(self, filters) -> bool:
        return len(filters.data_actions) > 0

    def filter_fn(self, item, filters) -> bool:
        return any(
            ((not any(item[v] for v in ALL_DATA_ACTIONS)) if v == DataAction.no_action else item[v])
            for v in filters.data_actions
        )


class OutcomeFilter(FilterComponent):
    @property
    def required_column(self):
        return (
            DatasetColumn.model_outcome
            if self.without_postprocessing
            else DatasetColumn.postprocessed_outcome
        )

    def check_fn(self, filters) -> bool:
        return len(filters.outcomes) > 0

    def filter_fn(self, item, filters) -> bool:
        return item[self.required_column] in filters.outcomes


class SmartTagFilter(FilterComponent):
    @property
    def required_column(self):
        return None

    def check_fn(self, filters) -> bool:
        return len(filters.smart_tags) > 0

    def filter_fn(self, item, filters) -> bool:
        return all(
            ((not any(item[v] for v in ALL_SMART_TAGS)) if v == SmartTag.no_smart_tag else item[v])
            for v in filters.smart_tags
        )


class FilterComposer:
    filters: List[Type[FilterComponent]] = [
        ConfidenceFilter,
        LabelFilter,
        UtteranceFilter,
        PredictionFilter,
        DataActionFilter,
        OutcomeFilter,
        SmartTagFilter,
    ]

    @classmethod
    def add_filter_component(cls, component: Type[FilterComponent]):
        cls.filters.append(component)

    @classmethod
    def filter_dataset(
        cls, dataset_split: Dataset, filters, config, without_postprocessing
    ) -> Dataset:
        """Filter dataset_split according to a filter component.

        Args:
            dataset_split: examples to filter.
            filters: On what to filter on.
            config: Azimuth Config.
            without_postprocessing: Filter on columns without_postprocessing (model)

        Returns:
            Filtered dataset_split.

        Raises:
            ValueError, if required column to filter by is not in the dataset_split's columns.

        """
        filter_stack = []
        for filter_cls in cls.filters:
            filter_object = filter_cls(config=config, without_postprocessing=without_postprocessing)
            if filter_object.check_fn(filters):
                if filter_object.required_column is not None:
                    verify_column_is_present(filter_object.required_column, dataset_split)
                filter_stack.append(filter_object.filter_fn)

        dataset_split = reduce(
            lambda ds, filter_fn: ds.filter(  # type: ignore
                filter_fn, fn_kwargs=dict(filters=filters)
            ),
            filter_stack,
            dataset_split,
        )
        return dataset_split


def filter_dataset_split(
    dataset_split: Dataset,
    filters: Union[DatasetFilters, NamedDatasetFilters],
    config: ProjectConfig,
    without_postprocessing: bool = False,
) -> Dataset:
    """Filter dataset_split according to a filter component.

    Args:
        dataset_split: examples to filter.
        filters: On what to filter on.
        config: Azimuth Config.
        without_postprocessing: Filter on columns without_postprocessing (model)

    Returns:
        Filtered dataset_split.

    Raises:
        ValueError, if required column to filter by is not in the dataset_split's columns.

    """
    return FilterComposer.filter_dataset(
        dataset_split, filters=filters, config=config, without_postprocessing=without_postprocessing
    )
