# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import Dict, Optional

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query

from azimuth.app import (
    get_config,
    get_dataset_split_manager,
    get_dataset_split_manager_mapping,
    get_task_manager,
)
from azimuth.config import AzimuthConfig
from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.plots.sankey_plot import make_sankey_plot
from azimuth.task_manager import TaskManager
from azimuth.types import DatasetSplitName, ModuleOptions, SupportedModule
from azimuth.types.class_overlap import (
    ClassOverlapPlotResponse,
    ClassOverlapResponse,
    ClassOverlapTableClassPair,
    ClassOverlapTableResponse,
)
from azimuth.types.model_performance import ConfusionMatrixResponse
from azimuth.utils.project import similarity_available
from azimuth.utils.routers import get_standard_task_result, query_pipeline_index

router = APIRouter()

TAGS = ["Class Overlap v1"]

EPSILON = 1e-4


@router.get(
    "/plot",
    summary="Get class overlap plot.",
    description="Get a plot of class overlap using Spectral clustering and Monte-Carlo sampling "
    "(currently set to all samples).",
    tags=TAGS,
    response_model=ClassOverlapPlotResponse,
)
def get_class_overlap_plot(
    dataset_split_name: DatasetSplitName,
    task_manager: TaskManager = Depends(get_task_manager),
    dataset_split_manager: DatasetSplitManager = Depends(get_dataset_split_manager),
    config: AzimuthConfig = Depends(get_config),
    self_overlap: bool = Query(
        False,
        title="SelfOverlap",
        description="Whether to include overlap of a class with itself.",
    ),
    scale_by_class: bool = Query(
        True,
        title="ScaleByClass",
        description="Whether to scale overlap values by class sample counts.",
    ),
    overlap_threshold: Optional[float] = Query(
        None,
        title="OverlapThreshold",
        description="Plot overlap greater than this value (`None` sets threshold to show ~10 "
        "class pairs).",
    ),
) -> ClassOverlapPlotResponse:
    if not similarity_available(config):
        raise HTTPException(
            400, detail="Please enable similarity in the configuration to enable this route."
        )

    task_result: ClassOverlapResponse = get_standard_task_result(
        SupportedModule.ClassOverlap,
        dataset_split_name=dataset_split_name,
        task_manager=task_manager,
        last_update=-1,
    )[0]
    class_overlap_plot_response: ClassOverlapPlotResponse = make_sankey_plot(
        task_result,
        dataset_split_manager,
        self_overlap=self_overlap,
        scale_by_class=scale_by_class,
        overlap_threshold=overlap_threshold,
    )

    return class_overlap_plot_response


@router.get(
    "",
    summary="Get class overlap table.",
    description="Get data for class overlap, confusion, and related utterance counts.",
    tags=TAGS,
    response_model=ClassOverlapTableResponse,
)
def get_class_overlap(
    dataset_split_name: DatasetSplitName,
    task_manager: TaskManager = Depends(get_task_manager),
    dataset_split_manager: DatasetSplitManager = Depends(get_dataset_split_manager),
    dataset_split_managers: Dict[DatasetSplitName, DatasetSplitManager] = Depends(
        get_dataset_split_manager_mapping
    ),
    pipeline_index: Optional[int] = Depends(query_pipeline_index),
) -> ClassOverlapTableResponse:
    eval_dm = dataset_split_managers.get(DatasetSplitName.eval)

    class_overlap_result: ClassOverlapResponse = get_standard_task_result(
        SupportedModule.ClassOverlap,
        dataset_split_name=dataset_split_name,
        task_manager=task_manager,
        last_update=-1,
    )[0]
    dataset_class_count = class_overlap_result.s_matrix.shape[0]

    # Compute number of utterances that are overlapping.
    overlapping_count = np.zeros_like(class_overlap_result.s_matrix)
    for class_idx, sim_arrays in class_overlap_result.similarity_arrays.items():
        norm_probs = np.stack([arrays.sample_probability_norm for arrays in sim_arrays.values()])
        overlapping_count[class_idx] = (norm_probs > EPSILON).sum(0)

    confusion_result: Optional[ConfusionMatrixResponse] = (
        get_standard_task_result(
            SupportedModule.ConfusionMatrix,
            DatasetSplitName.eval,
            task_manager=task_manager,
            mod_options=ModuleOptions(
                pipeline_index=pipeline_index, cf_normalize=False, cf_reorder_classes=False
            ),
            last_update=eval_dm.last_update,
        )[0]
        if pipeline_index is not None and eval_dm
        else None
    )

    class_counts_train = dataset_split_manager.class_distribution()
    class_counts_eval = (
        eval_dm.class_distribution()
        if eval_dm
        else np.zeros(dataset_split_manager.get_num_classes())
    )
    class_names = dataset_split_manager.get_class_names(labels_only=True)

    class_pairs_list = [
        ClassOverlapTableClassPair(
            source_class=class_names[i],
            target_class=class_names[j],
            overlap_score_train=class_overlap_result.s_matrix[i, j],
            pipeline_confusion_eval=confusion_result and confusion_result.confusion_matrix[i, j],
            utterance_count_source_train=class_counts_train[i],
            utterance_count_source_eval=class_counts_eval[i],
            utterance_count_with_overlap_train=overlapping_count[i, j],
        )
        for i in range(dataset_class_count)
        for j in range(dataset_class_count)
        if i != j
        and (
            class_overlap_result.s_matrix[i, j] > 0
            or (confusion_result and confusion_result.confusion_matrix[i, j] > 0)
        )
    ]

    api_result = ClassOverlapTableResponse(class_pairs=class_pairs_list)

    return api_result
