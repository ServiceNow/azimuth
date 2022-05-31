# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import List, Union

from datasets import Dataset

from azimuth.config import ProjectConfig
from azimuth.types import DatasetColumn, DatasetFilters, NamedDatasetFilters
from azimuth.types.tag import (
    ALL_DATA_ACTIONS,
    SMART_TAGS_FAMILY_MAPPING,
    DataAction,
    SmartTag,
)


def verify_column_is_present(column_name: str, dataset_split: Dataset):
    if column_name not in dataset_split.column_names:
        raise ValueError(f"{column_name} not in dataset_split's column names")


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
    if filters.confidence_min > 0 or filters.confidence_max < 1:
        confidence_column = (
            DatasetColumn.model_confidences
            if without_postprocessing
            else DatasetColumn.postprocessed_confidences
        )
        verify_column_is_present(confidence_column, dataset_split)
        dataset_split = dataset_split.filter(
            lambda x: filters.confidence_min <= x[confidence_column][0] <= filters.confidence_max
        )
    if len(filters.labels) > 0:
        verify_column_is_present(config.columns.label, dataset_split)
        dataset_split = dataset_split.filter(lambda x: x[config.columns.label] in filters.labels)
    if filters.utterance is not None:
        verify_column_is_present(config.columns.text_input, dataset_split)
        by = filters.utterance.lower()
        dataset_split = dataset_split.filter(lambda x: by in x[config.columns.text_input].lower())
    if len(filters.predictions) > 0:
        prediction_column = (
            DatasetColumn.model_predictions
            if without_postprocessing
            else DatasetColumn.postprocessed_prediction
        )
        verify_column_is_present(prediction_column, dataset_split)
        if without_postprocessing:
            dataset_split = dataset_split.filter(
                lambda x: x[DatasetColumn.model_predictions][0] in filters.predictions
            )
        else:
            dataset_split = dataset_split.filter(
                lambda x: x[DatasetColumn.postprocessed_prediction] in filters.predictions
            )
    if len(filters.data_actions) > 0:
        # We do OR for data_action tags.
        dataset_split = dataset_split.filter(
            lambda x: any(
                ((not any(x[v] for v in ALL_DATA_ACTIONS)) if v == DataAction.no_action else x[v])
                for v in filters.data_actions
            )
        )
    if len(filters.outcomes) > 0:
        outcome_column = (
            DatasetColumn.model_outcome
            if without_postprocessing
            else DatasetColumn.postprocessed_outcome
        )
        verify_column_is_present(outcome_column, dataset_split)
        # We do OR for outcomes.
        dataset_split = dataset_split.filter(lambda x: x[outcome_column] in filters.outcomes)
    for family, tags_in_family in filters.smart_tags.items():
        # For each smart tag family, we do OR, but AND between families
        # If None, it is none of them.
        if len(tags_in_family) > 0:
            # We add no_smart_tag to all families.
            tags_associated: List[SmartTag] = SMART_TAGS_FAMILY_MAPPING[family] + [
                SmartTag.no_smart_tag
            ]
            dataset_split = dataset_split.filter(
                lambda x: any(
                    (
                        (not any(x[tag.value] for tag in tags_associated[:-1]))
                        if tag_f is SmartTag.no_smart_tag
                        else x[tag_f.value]
                    )
                    for tag_f in tags_in_family
                )
            )

    return dataset_split
