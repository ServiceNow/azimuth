# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import Iterable, List, Optional, Union

from datasets import Dataset
from fastapi import APIRouter, Depends, Query

from azimuth.app import get_config, get_dataset_split_manager
from azimuth.config import AzimuthConfig
from azimuth.dataset_split_manager import DatasetSplitManager, PredictionTableKey
from azimuth.types import (
    AliasModel,
    DatasetColumn,
    NamedDatasetFilters,
    PaginationParams,
)
from azimuth.types.tag import ALL_DATA_ACTIONS, ALL_SMART_TAGS, DataAction
from azimuth.types.utterance import ModelPrediction, Utterance
from azimuth.utils.filtering import filter_dataset_split
from azimuth.utils.routers import build_named_dataset_filters, get_pagination

router = APIRouter()

TAGS = ["Prediction Difference v1"]


def item(i: Union[int, Iterable[int]]):
    if isinstance(i, int):
        return i
    return i[0]


class UtterancePair(AliasModel):
    index: int
    base_utterance: Utterance
    updated_utterance: Utterance


class PredictionDifferenceResponse(AliasModel):
    utterance_count: int
    utterances: List[UtterancePair]


@router.get("", response_model=PredictionDifferenceResponse, tags=TAGS)
def get_difference_in_pred(
    named_filters_base: NamedDatasetFilters = Depends(build_named_dataset_filters),
    config: AzimuthConfig = Depends(get_config),
    dataset_split_manager: DatasetSplitManager = Depends(get_dataset_split_manager),
    pipeline_index_base: int = Query(...),
    pipeline_index_updated: int = Query(...),
    pagination: Optional[PaginationParams] = Depends(get_pagination),
    without_postprocessing: bool = False,
) -> PredictionDifferenceResponse:
    dataset_filters = named_filters_base.to_dataset_filters(dataset_split_manager.get_class_names())
    table_key_1 = PredictionTableKey.from_pipeline_index(
        index=pipeline_index_base, config=config, use_bma=False
    )
    table_key_2 = PredictionTableKey.from_pipeline_index(
        index=pipeline_index_updated, config=config, use_bma=False
    )
    ds_1 = filter_dataset_split(
        dataset_split_manager.get_dataset_split(table_key_1),
        dataset_filters,
        config,
        without_postprocessing=without_postprocessing,
    )
    ds_2 = dataset_split_manager.get_dataset_split(table_key_2)
    intersection = set(ds_1[DatasetColumn.row_idx]).intersection(ds_2[DatasetColumn.row_idx])
    ds_1 = ds_1.filter(lambda i: i in intersection, input_columns=DatasetColumn.row_idx)
    ds_2 = ds_2.filter(lambda i: i in intersection, input_columns=DatasetColumn.row_idx)
    diff_col = (
        DatasetColumn.model_predictions
        if without_postprocessing
        else DatasetColumn.postprocessed_prediction
    )
    diff_map = [item(p1) != item(p2) for p1, p2 in zip(ds_1[diff_col], ds_2[diff_col])]

    diff_len = sum(diff_map)
    if diff_len == 0:
        return PredictionDifferenceResponse(utterance_count=0, utterances=[])
    ds_1 = ds_1.filter(lambda i: diff_map[i], input_columns=DatasetColumn.row_idx)
    if pagination is not None:
        indices = ds_1[DatasetColumn.row_idx][
            pagination.offset : pagination.offset + pagination.limit
        ]
        ds_1 = ds_1.filter(lambda i: i in indices, input_columns=DatasetColumn.row_idx)

    ds1_class_names = dataset_split_manager.get_dataset_split_with_class_names(table_key_1)
    ds2_class_names = dataset_split_manager.get_dataset_split_with_class_names(table_key_2)

    return PredictionDifferenceResponse(
        utterances=[
            UtterancePair(
                index=index,
                base_utterance=make_utterance(
                    dataset_split_manager, ds1_class_names, index, table_key_1
                ),
                updated_utterance=make_utterance(
                    dataset_split_manager, ds2_class_names, index, table_key_2
                ),
            )
            for index in ds_1[DatasetColumn.row_idx]
        ],
        utterance_count=diff_len,
    )


def make_utterance(
    dataset_split_manager: DatasetSplitManager,
    dataset_with_class_names: Dataset,
    index: int,
    table_key: PredictionTableKey,
) -> Utterance:
    data = dataset_with_class_names[index]
    smart_tags = [
        t
        for t, v in dataset_split_manager.get_tags([index], table_key)[0].items()
        if v and t in ALL_SMART_TAGS
    ]
    data_action = next(
        iter(
            [
                t
                for t, v in dataset_split_manager.get_tags([index], table_key)[0].items()
                if v and t in ALL_DATA_ACTIONS
            ]
        ),
        DataAction.no_action,
    )
    return Utterance(
        index=index,
        model_prediction=ModelPrediction(
            model_predictions=data[DatasetColumn.model_predictions],
            postprocessed_prediction=data[DatasetColumn.postprocessed_prediction],
            model_confidences=data[DatasetColumn.model_confidences],
            postprocessed_confidences=data[DatasetColumn.postprocessed_confidences],
            model_outcome=data[DatasetColumn.model_outcome],
            postprocessed_outcome=data[DatasetColumn.postprocessed_outcome],
        ),
        model_saliency=None,
        smart_tags=smart_tags,
        data_action=data_action,
        label=data[dataset_split_manager.config.columns.label],
        utterance=data[dataset_split_manager.config.columns.text_input],
    )
