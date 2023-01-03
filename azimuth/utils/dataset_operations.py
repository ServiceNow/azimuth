# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import List, Union, cast

from datasets import Dataset

from azimuth.config import ProjectConfig
from azimuth.types import DatasetColumn, DatasetFilters, NamedDatasetFilters
from azimuth.types.outcomes import OutcomeName
from azimuth.types.tag import (
    ALL_DATA_ACTIONS,
    SMART_TAGS_FAMILY_MAPPING,
    DataAction,
    SmartTag,
    SmartTagFamily,
)
from azimuth.utils.utterance import clean_utterance


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
        if confidence_column in dataset_split.column_names:
            dataset_split = dataset_split.filter(
                lambda x: filters.confidence_min
                <= x[confidence_column][0]
                <= filters.confidence_max
            )
    if (
        len(filters.label) > 0
        and config.columns.label in dataset_split.column_names
        and dataset_split.num_rows != 0
    ):
        dataset_split = dataset_split.filter(lambda x: x[config.columns.label] in filters.label)
    if (
        filters.utterance is not None
        and config.columns.text_input in dataset_split.column_names
        and dataset_split.num_rows != 0
    ):
        cleaned_utterance = clean_utterance(filters.utterance)
        # Filter in utterances or if string matches a known row_idx or persistent_id
        dataset_split = dataset_split.filter(
            lambda x: cleaned_utterance in clean_utterance(x[config.columns.text_input])
            or filters.utterance == str(x[DatasetColumn.row_idx])
            or filters.utterance == str(x[config.columns.persistent_id])
        )
    if len(filters.prediction) > 0 and dataset_split.num_rows != 0:
        prediction_column = (
            DatasetColumn.model_predictions
            if without_postprocessing
            else DatasetColumn.postprocessed_prediction
        )
        if prediction_column in dataset_split.column_names:
            if without_postprocessing:
                dataset_split = dataset_split.filter(
                    lambda x: x[DatasetColumn.model_predictions][0] in filters.prediction
                )
            else:
                dataset_split = dataset_split.filter(
                    lambda x: x[DatasetColumn.postprocessed_prediction] in filters.prediction
                )
    if len(filters.data_action) > 0 and dataset_split.num_rows != 0:
        # We do OR for data_action tags.
        dataset_split = dataset_split.filter(
            lambda x: any(
                ((not any(x[v] for v in ALL_DATA_ACTIONS)) if v == DataAction.no_action else x[v])
                for v in filters.data_action
            )
        )
    if len(filters.outcome) > 0 and dataset_split.num_rows != 0:
        outcome_column = (
            DatasetColumn.model_outcome
            if without_postprocessing
            else DatasetColumn.postprocessed_outcome
        )
        if outcome_column in dataset_split.column_names:
            # We do OR for outcomes.
            dataset_split = dataset_split.filter(lambda x: x[outcome_column] in filters.outcome)
    for key, tags_in_family in filters.smart_tags.items():
        # For each smart tag family, we do OR, but AND between families
        # If NO_SMART_TAGS, it is none of them.
        family = cast(SmartTagFamily, key)
        if (
            len(tags_in_family) > 0
            and all(tag in dataset_split.column_names for tag in SMART_TAGS_FAMILY_MAPPING[family])
            and dataset_split.num_rows != 0
        ):
            dataset_split = dataset_split.filter(
                lambda x: any(
                    (
                        (not any(x[tag.value] for tag in SMART_TAGS_FAMILY_MAPPING[family]))
                        if tag_f == SmartTag.no_smart_tag
                        else x[tag_f]
                    )
                    for tag_f in tags_in_family
                )
            )

    return dataset_split


def get_predictions_from_ds(ds: Dataset, without_postprocessing: bool = False) -> List[int]:
    """Get predicted classes, with or without postprocessing.

    Args:
        ds: Dataset Split for which to get predictions.
        without_postprocessing: Determine which column to use.

    Returns: List of Predictions
    """
    if without_postprocessing:
        return cast(List[int], [preds[0] for preds in ds[DatasetColumn.model_predictions]])
    else:
        return cast(List[int], ds[DatasetColumn.postprocessed_prediction])


def get_confidences_from_ds(ds: Dataset, without_postprocessing: bool = False) -> List[List[float]]:
    """Get confidences, with or without postprocessing.

    Notes: Confidences are sorted according to their values (not the class id).

    Args:
        ds: Dataset Split for which to get confidences.
        without_postprocessing: Determine which column to use.

    Returns: List of Confidences
    """
    confidences = (
        ds[DatasetColumn.model_confidences]
        if without_postprocessing
        else ds[DatasetColumn.postprocessed_confidences]
    )
    return cast(List[List[float]], confidences)


def get_outcomes_from_ds(ds: Dataset, without_postprocessing: bool = False) -> List[OutcomeName]:
    """Get outcomes, with or without postprocessing.

    Args:
        ds: Dataset Split for which to get outcomes.
        without_postprocessing: Determine which column to use.

    Returns: List of Outcomes
    """
    outcomes = (
        ds[DatasetColumn.model_outcome]
        if without_postprocessing
        else ds[DatasetColumn.postprocessed_outcome]
    )
    return cast(List[OutcomeName], outcomes)
