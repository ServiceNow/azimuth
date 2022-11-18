# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from copy import copy
from enum import Enum
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
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

router = APIRouter()

TAGS = ["Utterances v1"]


class UtterancesSortableColumn(str, Enum):
    index = "index"  # type: ignore
    utterance = "utterance"
    label = "label"
    prediction = "prediction"
    confidence = "confidence"


def get_sort_mapping(config=Depends(get_config)):
    return {
        UtterancesSortableColumn.index: DatasetColumn.row_idx,
        UtterancesSortableColumn.utterance: config.columns.text_input,
        UtterancesSortableColumn.label: config.columns.label,
        UtterancesSortableColumn.prediction: DatasetColumn.postprocessed_prediction,
        UtterancesSortableColumn.confidence: "_top_conf",
    }


@router.get(
    "",
    summary="Get table view",
    description="Get a table view of the utterances according to filters.",
    tags=TAGS,
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
    sort_mapping: Dict[UtterancesSortableColumn, str] = Depends(get_sort_mapping),
    task_manager: TaskManager = Depends(get_task_manager),
    config: AzimuthConfig = Depends(get_config),
    dataset_split_manager: DatasetSplitManager = Depends(get_dataset_split_manager),
    pipeline_index: Optional[int] = Depends(query_pipeline_index),
    pagination: Optional[PaginationParams] = Depends(get_pagination),
    without_postprocessing: bool = Query(False, title="Without Postprocessing"),
) -> GetUtterancesResponse:
    if (
        sort_by in {UtterancesSortableColumn.confidence, UtterancesSortableColumn.prediction}
        and pipeline_index is None
    ):
        sort_by = UtterancesSortableColumn.index

    threshold = (
        config.pipelines[pipeline_index].threshold
        if config.pipelines is not None
        and pipeline_index is not None
        and postprocessing_known(task_manager.config, pipeline_index)
        else None
    )

    dataset_filters = named_filters.to_dataset_filters(dataset_split_manager.get_class_names())
    table_key = (
        PredictionTableKey.from_pipeline_index(
            pipeline_index,
            config,
        )
        if pipeline_index is not None
        else None
    )
    ds_filtered = filter_dataset_split(
        dataset_split_manager.get_dataset_split(table_key),
        dataset_filters,
        dataset_split_manager.config,
        without_postprocessing,
    )

    if len(ds_filtered) == 0:
        # No utterances, empty response.
        return GetUtterancesResponse(
            utterances=[], utterance_count=0, confidence_threshold=threshold
        )

    ds = dataset_split_manager.get_dataset_split_with_class_names(table_key=table_key).select(
        ds_filtered[DatasetColumn.row_idx]
    )

    if indices is not None:
        if len(set(indices) - set(ds[DatasetColumn.row_idx])) > 0:
            raise HTTPException(404, detail=f"Indices not found after filtering {indices}")
        ds = ds.filter(lambda i: i in indices, input_columns=DatasetColumn.row_idx)

    # We create _top_conf because we can't sort on a column made of lists.
    # Starts with underscore to emphasize that
    # this should not be used elsewhere and it is not saved.
    if sort_by is UtterancesSortableColumn.confidence:
        ds = ds.map(lambda i: {"_top_conf": i[DatasetColumn.postprocessed_confidences][0]})
    ds = ds.sort(sort_mapping[sort_by], reverse=descending)

    utterance_count = len(ds)  # Before pagination to get the full length.
    if pagination is not None:
        indices = ds[DatasetColumn.row_idx][
            pagination.offset : pagination.offset + pagination.limit
        ]
        ds = ds.filter(lambda i: i in indices, input_columns=DatasetColumn.row_idx)

    if len(ds) == 0:
        # No utterances, empty response.
        return GetUtterancesResponse(
            utterances=[], utterance_count=utterance_count, confidence_threshold=threshold
        )

    indices_subset = ds[DatasetColumn.row_idx]
    tags = dataset_split_manager.get_tags(indices_subset, table_key=table_key)

    if predictions_available(config) and pipeline_index is not None:
        # For memory efficiency
        ds = ds.with_format(
            columns=[
                DatasetColumn.row_idx,
                DatasetColumn.model_predictions,
                DatasetColumn.postprocessed_prediction,
                DatasetColumn.model_confidences,
                DatasetColumn.postprocessed_confidences,
                dataset_split_manager.config.columns.label,
                dataset_split_manager.config.columns.text_input,
                DatasetColumn.model_outcome,
                DatasetColumn.postprocessed_outcome,
            ]
        )
        predictions: List[Optional[ModelPrediction]] = [
            ModelPrediction(
                model_predictions=data[DatasetColumn.model_predictions],
                postprocessed_prediction=data[DatasetColumn.postprocessed_prediction],
                model_confidences=data[DatasetColumn.model_confidences],
                postprocessed_confidences=data[DatasetColumn.postprocessed_confidences],
                model_outcome=data[DatasetColumn.model_outcome],
                postprocessed_outcome=data[DatasetColumn.postprocessed_outcome],
            )
            for data in ds
        ]
    else:
        predictions = [None] * len(ds)

    if saliency_available(config) and pipeline_index is not None:
        saliency_results = get_standard_task_result(
            SupportedMethod.Saliency,
            dataset_split_name,
            task_manager,
            last_update=dataset_split_manager.last_update,
            mod_options=ModuleOptions(pipeline_index=pipeline_index, indices=indices_subset),
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
            data_action=next(
                (t for t, v in tag.items() if t in ALL_DATA_ACTIONS and v),
                DataAction.no_action,
            ),
            label=data[dataset_split_manager.config.columns.label],
            utterance=data[dataset_split_manager.config.columns.text_input],
            model_prediction=model_prediction,
            model_saliency=model_saliency,
            overlapped_classes=data[DatasetColumn.overlapped_classes]
            if DatasetColumn.overlapped_classes in ds.column_names
            else [],
            # Smart tags families
            **{
                family.value: [t for t in tags_in_family if tag[t]]
                if family in available_families
                else []
                for family, tags_in_family in SMART_TAGS_FAMILY_MAPPING.items()
            },
        )
        for data, tag, model_saliency, model_prediction in zip(
            ds, tags, model_saliencies, predictions
        )
    ]

    return GetUtterancesResponse(
        utterances=utterances, utterance_count=utterance_count, confidence_threshold=threshold
    )


@router.get(
    "/{index}/perturbed_utterances",
    summary="Get a perturbed utterances for a single utterance.",
    description="Get a perturbed utterances for a single utterance.",
    tags=TAGS,
    response_model=List[PerturbedUtteranceWithClassNames],
    dependencies=[Depends(require_available_model)],
)
def get_perturbed_utterances(
    dataset_split_name: DatasetSplitName,
    index: int,
    task_manager: TaskManager = Depends(get_task_manager),
    dataset_split_manager: DatasetSplitManager = Depends(get_dataset_split_manager),
    pipeline_index: int = Depends(require_pipeline_index),
) -> List[PerturbedUtteranceWithClassNames]:
    """
    Perturbation tests are meant to be requested per utterance. The user is requesting more
    details on perturbation tests for an utterance based on the results in the
    perturbation_testing_summary. Therefore only a GET request is available for a provided idx.

    For endpoints that support per index request, we will not return a list of result.
    """
    if not perturbation_testing_available(task_manager.config):
        return []

    response: List[PerturbedUtteranceResult] = get_standard_task_result(
        SupportedModule.PerturbationTesting,
        dataset_split_name,
        task_manager,
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
    tags=TAGS,
    response_model=SimilarUtterancesResponse,
)
def get_similar(
    dataset_split_name: DatasetSplitName,
    index: int,
    limit: int = Query(20, title="Limit"),
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
    # NOTE: idx may be float in the HF Dataset.
    items: Dict[int, Dict] = {
        idx: neighbors_ds_with_class_names[int(idx)] for idx in item_scores.keys()  # type: ignore
    }
    # Build utterances from `items`
    similar_utterances = [
        SimilarUtterance(
            index=data[DatasetColumn.row_idx],
            utterance=data[config.columns.text_input],
            label=data[config.columns.label],
            postprocessed_prediction=data.get(DatasetColumn.postprocessed_prediction, None),
            postprocessed_confidence=data.get(DatasetColumn.postprocessed_confidences, [None])[0],
            similarity=item_scores[idx],
        )
        for idx, data in items.items()
    ]

    return SimilarUtterancesResponse(utterances=similar_utterances)
