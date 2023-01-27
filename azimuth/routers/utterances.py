# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from copy import copy
from enum import Enum
from typing import Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from starlette.status import HTTP_404_NOT_FOUND

from azimuth.app import (
    get_config,
    get_dataset_split_manager,
    get_dataset_split_manager_mapping,
    get_task_manager,
)
from azimuth.config import AzimuthConfig
from azimuth.dataset_split_manager import DatasetSplitManager, PredictionTableKey
from azimuth.task_manager import TaskManager
from azimuth.types import (
    DatasetColumn,
    DatasetSplitName,
    ModuleOptions,
    NamedDatasetFilters,
    PaginationParams,
    SupportedMethod,
    SupportedModule,
)
from azimuth.types.perturbation_testing import (
    PerturbedUtteranceResult,
    PerturbedUtteranceWithClassNames,
)
from azimuth.types.similarity_analysis import (
    SimilarUtterance,
    SimilarUtterancesResponse,
)
from azimuth.types.tag import (
    ALL_DATA_ACTIONS,
    DATASET_SMART_TAG_FAMILIES,
    PIPELINE_SMART_TAG_FAMILIES,
    SMART_TAGS_FAMILY_MAPPING,
    DataAction,
)
from azimuth.types.utterance import (
    GetUtterancesResponse,
    ModelPrediction,
    ModelSaliency,
    Utterance,
    UtterancePatch,
)
from azimuth.utils.dataset_operations import filter_dataset_split
from azimuth.utils.project import (
    perturbation_testing_available,
    postprocessing_known,
    predictions_available,
    saliency_available,
    similarity_available,
)
from azimuth.utils.routers import (
    build_named_dataset_filters,
    get_pagination,
    get_standard_task_result,
    query_pipeline_index,
    require_available_model,
    require_pipeline_index,
)
from azimuth.utils.validation import assert_not_none

router = APIRouter()


class UtterancesSortableColumn(str, Enum):
    index = "index"  # type: ignore
    utterance = "utterance"
    label = "label"
    prediction = "prediction"
    confidence = "confidence"


@router.get(
    "",
    summary="Get utterances table view",
    description="Get a table view of the utterances according to filters.",
    response_model=GetUtterancesResponse,
)
def get_utterances(
    dataset_split_name: DatasetSplitName,
    indices: List[int] = Query(None, title="Indices"),
    named_filters: NamedDatasetFilters = Depends(build_named_dataset_filters),
    sort_by: UtterancesSortableColumn = Query(
        UtterancesSortableColumn.index, title="Column to sort utterances by", alias="sort"
    ),
    descending: bool = Query(False, title="Descending"),
    task_manager: TaskManager = Depends(get_task_manager),
    config: AzimuthConfig = Depends(get_config),
    dataset_split_manager: DatasetSplitManager = Depends(get_dataset_split_manager),
    pipeline_index: Optional[int] = Depends(query_pipeline_index),
    pagination: Optional[PaginationParams] = Depends(get_pagination),
    without_postprocessing: bool = Query(False, title="Without Postprocessing"),
) -> GetUtterancesResponse:
    if predictions_available(config) and pipeline_index is not None:
        threshold = (
            assert_not_none(config.pipelines)[pipeline_index].threshold
            if postprocessing_known(config, pipeline_index)
            else None
        )
        table_key = PredictionTableKey.from_pipeline_index(pipeline_index, config)
    else:
        threshold, table_key = None, None

    ds = dataset_split_manager.get_dataset_split(table_key)
    if indices is not None:
        ds = ds.select(indices)
    ds = filter_dataset_split(
        ds,
        named_filters.to_dataset_filters(dataset_split_manager.get_class_names()),
        config,
        without_postprocessing,
    )
    ds = dataset_split_manager.get_dataset_split_with_class_names(table_key=table_key).select(
        ds[DatasetColumn.row_idx]
    )

    # We create _top_conf and _top_prediction because we can't sort on columns made of lists.
    # They start with an underscore to emphasize that they are not saved and that therefore they
    # should not be used anywhere else.
    if sort_by == UtterancesSortableColumn.confidence and pipeline_index is not None:
        sort_by_column = "_top_conf"
        column = (
            DatasetColumn.model_confidences
            if without_postprocessing
            else DatasetColumn.postprocessed_confidences
        )
        ds = ds.map(lambda i: {sort_by_column: i[column][0]})
    elif sort_by == UtterancesSortableColumn.prediction and pipeline_index is not None:
        if without_postprocessing:
            sort_by_column = "_top_prediction"
            ds = ds.map(lambda i: {sort_by_column: i[DatasetColumn.model_predictions][0]})
        else:
            sort_by_column = DatasetColumn.postprocessed_prediction
    elif sort_by == UtterancesSortableColumn.utterance:
        sort_by_column = config.columns.text_input
    elif sort_by == UtterancesSortableColumn.label:
        sort_by_column = config.columns.label
    else:
        sort_by_column = DatasetColumn.row_idx
    ds = ds.sort(sort_by_column, reverse=descending)

    utterance_count = len(ds)  # Before pagination to get the full length.
    if pagination is not None:
        indices = ds[DatasetColumn.row_idx][
            pagination.offset : pagination.offset + pagination.limit
        ]
        ds = ds.filter(lambda i: i in indices, input_columns=DatasetColumn.row_idx)

    if utterance_count == 0:
        # No utterances, empty response.
        return GetUtterancesResponse(
            utterances=[], utterance_count=utterance_count, confidence_threshold=threshold
        )

    if saliency_available(config) and pipeline_index is not None:
        saliency_results = get_standard_task_result(
            SupportedMethod.Saliency,
            dataset_split_name,
            task_manager,
            config=config,
            last_update=dataset_split_manager.last_update,
            mod_options=ModuleOptions(
                pipeline_index=pipeline_index, indices=ds[DatasetColumn.row_idx]
            ),
        )
        model_saliencies: List[Optional[ModelSaliency]] = [
            ModelSaliency(
                tokens=saliency_result.tokens,
                saliencies=saliency_result.saliency,
            )
            for saliency_result in saliency_results
        ]
    else:
        model_saliencies = [None] * len(ds)

    available_families = copy(DATASET_SMART_TAG_FAMILIES)
    if pipeline_index is not None:
        available_families += PIPELINE_SMART_TAG_FAMILIES

    utterances = [
        Utterance(
            index=data[DatasetColumn.row_idx],
            persistent_id=data[config.columns.persistent_id],
            data_action=next((t for t in ALL_DATA_ACTIONS if data[t]), DataAction.no_action),
            label=data[config.columns.label],
            utterance=data[config.columns.text_input],
            model_prediction=ModelPrediction(
                model_predictions=data[DatasetColumn.model_predictions],
                postprocessed_prediction=data[DatasetColumn.postprocessed_prediction],
                model_confidences=data[DatasetColumn.model_confidences],
                postprocessed_confidences=data[DatasetColumn.postprocessed_confidences],
                model_outcome=data[DatasetColumn.model_outcome],
                postprocessed_outcome=data[DatasetColumn.postprocessed_outcome],
                preprocessing_steps=data[DatasetColumn.pipeline_steps]["preprocessing_steps"],
                postprocessing_steps=data[DatasetColumn.pipeline_steps]["postprocessing_steps"],
            )
            if predictions_available(config) and pipeline_index is not None
            else None,
            model_saliency=model_saliency,
            # Smart tags families
            **{
                family.value: [t for t in tags_in_family if data[t]]
                if family in available_families
                else []
                for family, tags_in_family in SMART_TAGS_FAMILY_MAPPING.items()
            },
        )
        for data, model_saliency in zip(ds, model_saliencies)
    ]

    return GetUtterancesResponse(
        utterances=utterances, utterance_count=utterance_count, confidence_threshold=threshold
    )


@router.patch(
    "",
    summary="Patch utterances",
    description="Patch utterances, such as updating proposed actions.",
    response_model=List[UtterancePatch],
)
def patch_utterances(
    utterances: List[UtterancePatch] = Body(...),
    config: AzimuthConfig = Depends(get_config),
    dataset_split_manager: DatasetSplitManager = Depends(get_dataset_split_manager),
    ignore_not_found: bool = Query(False),
) -> List[UtterancePatch]:
    if ignore_not_found:
        all_persistent_ids = dataset_split_manager.get_dataset_split()[config.columns.persistent_id]
        utterances = [u for u in utterances if u.persistent_id in all_persistent_ids]

    persistent_ids = [utterance.persistent_id for utterance in utterances]
    try:
        row_indices = dataset_split_manager.get_row_indices_from_persistent_id(persistent_ids)
    except ValueError as e:
        raise HTTPException(HTTP_404_NOT_FOUND, detail=f"Persistent id not found: {e}.")

    data_actions = {}
    for row_idx, utterance in zip(row_indices, utterances):
        data_actions[row_idx] = {data_action: False for data_action in ALL_DATA_ACTIONS}
        if utterance.data_action != DataAction.no_action:
            data_actions[row_idx][utterance.data_action] = True

    dataset_split_manager.add_tags(data_actions)

    updated_tags = dataset_split_manager.get_tags(row_indices)

    return [
        UtterancePatch(
            persistent_id=persistent_id,
            data_action=next(
                (tag for tag, value in tags.items() if tag in ALL_DATA_ACTIONS and value),
                DataAction.no_action,
            ),
        )
        for persistent_id, tags in zip(persistent_ids, updated_tags.values())
    ]


@router.get(
    "/{index}/perturbed_utterances",
    summary="Get a perturbed utterances for a single utterance.",
    description="Get a perturbed utterances for a single utterance.",
    response_model=List[PerturbedUtteranceWithClassNames],
    dependencies=[Depends(require_available_model)],
)
def get_perturbed_utterances(
    dataset_split_name: DatasetSplitName,
    index: int,
    task_manager: TaskManager = Depends(get_task_manager),
    config: AzimuthConfig = Depends(get_config),
    dataset_split_manager: DatasetSplitManager = Depends(get_dataset_split_manager),
    pipeline_index: int = Depends(require_pipeline_index),
) -> List[PerturbedUtteranceWithClassNames]:
    """
    Perturbation tests are meant to be requested per utterance. The user is requesting more
    details on perturbation tests for an utterance based on the results in the
    perturbation_testing_summary. Therefore only a GET request is available for a provided idx.

    For endpoints that support per index request, we will not return a list of result.
    """
    if not perturbation_testing_available(config):
        return []

    response: List[PerturbedUtteranceResult] = get_standard_task_result(
        SupportedModule.PerturbationTesting,
        dataset_split_name,
        task_manager,
        config=config,
        last_update=dataset_split_manager.last_update,
        mod_options=ModuleOptions(pipeline_index=pipeline_index, indices=[index]),
    )[0]

    named_response = [
        PerturbedUtteranceWithClassNames(
            prediction=dataset_split_manager.get_class_names()[r.prediction],
            **r.dict(exclude={"prediction"}),
        )
        for r in response
    ]
    return named_response


@router.get(
    "/{index}/similar_utterances",
    summary="Get similar examples to a query",
    description="Get similar examples using a KNN approach.",
    response_model=SimilarUtterancesResponse,
)
def get_similar(
    dataset_split_name: DatasetSplitName,
    index: int,
    limit: int = Query(20, title="Limit", ge=1),
    neighbors_dataset_split_name: Optional[DatasetSplitName] = Query(
        None, title="Neighbors dataset split"
    ),
    # the source dataset
    dataset_split_manager: DatasetSplitManager = Depends(get_dataset_split_manager),
    dataset_split_managers: Dict[DatasetSplitName, Optional[DatasetSplitManager]] = Depends(
        get_dataset_split_manager_mapping
    ),
    config: AzimuthConfig = Depends(get_config),
    pipeline_index: Optional[int] = Depends(query_pipeline_index),
) -> SimilarUtterancesResponse:
    if not similarity_available(config):
        return SimilarUtterancesResponse(utterances=[])

    # Set same split if not specified.
    neighbors_dataset_split_name = neighbors_dataset_split_name or dataset_split_name

    neighbors_ds = dataset_split_managers.get(neighbors_dataset_split_name)
    if neighbors_ds is None:
        raise HTTPException(HTTP_404_NOT_FOUND, detail="Dataset split not found.")
    table_key = (
        PredictionTableKey.from_pipeline_index(
            pipeline_index,
            config,
        )
        if pipeline_index is not None
        else None
    )

    neighbors_ds_with_class_names = neighbors_ds.get_dataset_split_with_class_names(table_key)

    # We need to get the pipeline_index for full output with predicted class and confidence.
    source_ds = dataset_split_manager.get_dataset_split(table_key=table_key)

    # Get a list of indices and scores.
    item_scores = dict(
        source_ds.select([index])[f"neighbors_{neighbors_dataset_split_name}"][0][:limit]
    )
    items: Dict[int, Dict] = {
        idx: neighbors_ds_with_class_names[int(idx)] for idx in item_scores.keys()
    }
    # Build utterances from `items`
    similar_utterances = [
        SimilarUtterance(
            index=data[DatasetColumn.row_idx],
            persistent_id=data[config.columns.persistent_id],
            utterance=data[config.columns.text_input],
            label=data[config.columns.label],
            postprocessed_prediction=data.get(DatasetColumn.postprocessed_prediction, None),
            postprocessed_confidence=data.get(DatasetColumn.postprocessed_confidences, [None])[0],
            similarity=item_scores[idx],
        )
        for idx, data in items.items()
    ]

    return SimilarUtterancesResponse(utterances=similar_utterances)
