# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import Union

from datasets import Dataset

from azimuth.config import ProjectConfig
from azimuth.types import DatasetColumn, DatasetFilters, NamedDatasetFilters
from azimuth.types.tag import ALL_DATA_ACTIONS, ALL_SMART_TAGS, DataAction, SmartTag


def filter_dataset_split(
    dataset_split: Dataset,
    filters: Union[DatasetFilters, NamedDatasetFilters],
    config: ProjectConfig,
) -> Dataset:
    """Filter dataset_split according to a filter component.

    Args:
        dataset_split: examples to filter.
        filters: On what to filter on.
        config: Azimuth Config.

    Returns:
        Filtered dataset_split.

    Raises:
        ValueError, if required column to filter by is not in the dataset_split's columns.

    """

    if filters.confidence_min > 0 or filters.confidence_max < 1:
        dataset_split = dataset_split.filter(
            lambda x: filters.confidence_min
            <= x[DatasetColumn.postprocessed_confidences][0]
            <= filters.confidence_max
        )
    if len(filters.labels) > 0:
        if config.columns.label not in dataset_split.column_names:
            raise ValueError("label not in dataset_split's column names")
        dataset_split = dataset_split.filter(lambda x: x[config.columns.label] in filters.labels)
    if filters.utterance is not None:
        if config.columns.text_input not in dataset_split.column_names:
            raise ValueError("Text must be in column named utterance")
        by = filters.utterance.lower()
        dataset_split = dataset_split.filter(lambda x: by in x[config.columns.text_input].lower())
    if len(filters.predictions) > 0:
        if DatasetColumn.postprocessed_prediction not in dataset_split.column_names:
            raise ValueError(
                f"{DatasetColumn.postprocessed_prediction} not in dataset_split's column names"
            )
        dataset_split = dataset_split.filter(
            lambda x: x[DatasetColumn.postprocessed_prediction] in filters.predictions
        )
    if len(filters.data_actions) > 0:
        # We do OR for data_action tags.
        dataset_split = dataset_split.filter(
            lambda x: any(
                ((not any(x[v] for v in ALL_DATA_ACTIONS)) if v is DataAction.no_action else x[v])
                for v in filters.data_actions
            )
        )
    if len(filters.outcomes) > 0:
        # We do OR for outcomes.
        dataset_split = dataset_split.filter(lambda x: x[DatasetColumn.outcome] in filters.outcomes)
    if len(filters.smart_tags) > 0:
        # For each smart tag family, we do OR, but AND between families
        # If None, it is none of them.
        dataset_split = dataset_split.filter(
            lambda x: all(
                ((not any(x[v] for v in ALL_SMART_TAGS)) if v is SmartTag.no_smart_tag else x[v])
                for v in filters.smart_tags
            )
        )
    return dataset_split
