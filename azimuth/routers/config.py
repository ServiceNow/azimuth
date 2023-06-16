# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
import os
from typing import Dict, List

import structlog
from fastapi import APIRouter, Body, Depends, HTTPException, Query
from starlette.status import (
    HTTP_400_BAD_REQUEST,
    HTTP_403_FORBIDDEN,
    HTTP_500_INTERNAL_SERVER_ERROR,
)

from azimuth.app import (
    get_config,
    get_task_manager,
    initialize_managers,
    require_editable_config,
    run_startup_tasks,
)
from azimuth.config import (
    AzimuthConfig,
    AzimuthConfigHistoryWithHash,
    AzimuthValidationError,
    CustomObject,
    PipelineDefinition,
    SupportedLanguage,
)
from azimuth.task_manager import TaskManager
from azimuth.utils.cluster import default_cluster
from azimuth.utils.project import update_config

log = structlog.get_logger(__name__)
router = APIRouter()

REQUIRED = ""


@router.get(
    "/default",
    summary="Get default configuration",
    description="Get the default configuration",
    response_model=AzimuthConfig,
)
def get_config_default(
    language: SupportedLanguage = Query(AzimuthConfig.__fields__["language"].default),
) -> AzimuthConfig:
    return AzimuthConfig(
        dataset=CustomObject(class_name=REQUIRED),
        language=language,
        pipelines=[PipelineDefinition(name=REQUIRED, model=CustomObject(class_name=REQUIRED))],
    )


@router.get(
    "/history",
    summary="Get configuration history",
    description="Get the history of the configuration",
    response_model=List[AzimuthConfigHistoryWithHash],
)
def get_config_history(
    config: AzimuthConfig = Depends(get_config),
) -> List[AzimuthConfigHistoryWithHash]:
    return config.get_config_history()


@router.get(
    "",
    summary="Get configuration",
    description="Get the current configuration",
    response_model=AzimuthConfig,
)
def get_config_def(
    config: AzimuthConfig = Depends(get_config),
) -> AzimuthConfig:
    return config


@router.patch(
    "/validate",
    summary="Validate config",
    description="Validate the given partial config update and return the complete config that would"
    " result if this update was applied.",
    response_model=AzimuthConfig,
    dependencies=[Depends(require_editable_config)],
)
def validate_config(
    config: AzimuthConfig = Depends(get_config),
    partial_config: Dict = Body(...),
) -> AzimuthConfig:
    new_config = update_config(old_config=config, partial_config=partial_config)

    assert_permission_to_update_config(old_config=config, new_config=new_config)

    return new_config


@router.patch(
    "",
    summary="Update config",
    description="Update the config.",
    response_model=AzimuthConfig,
    dependencies=[Depends(require_editable_config)],
)
def patch_config(
    task_manager: TaskManager = Depends(get_task_manager),
    config: AzimuthConfig = Depends(get_config),
    partial_config: Dict = Body(...),
) -> AzimuthConfig:
    log.info(f"Validating config change with {partial_config}.")
    new_config = update_config(old_config=config, partial_config=partial_config)

    assert_permission_to_update_config(old_config=config, new_config=new_config)

    if new_config.large_dask_cluster != config.large_dask_cluster:
        cluster = default_cluster(new_config.large_dask_cluster)
    else:
        cluster = task_manager.cluster

    try:
        run_startup_tasks(new_config, cluster)
        log.info(f"Config successfully updated with {partial_config}.")
    except Exception as e:
        log.error("Rollback config update due to error", exc_info=e)
        new_config = config
        initialize_managers(new_config, task_manager.cluster)
        log.info("Config update cancelled.")
        if isinstance(e, AzimuthValidationError):
            raise HTTPException(HTTP_400_BAD_REQUEST, detail=str(e))
        else:
            raise HTTPException(
                HTTP_500_INTERNAL_SERVER_ERROR, detail="Error when loading the new config."
            )

    return new_config


def assert_permission_to_update_config(*, old_config: AzimuthConfig, new_config: AzimuthConfig):
    if old_config.artifact_path != new_config.artifact_path:
        raise HTTPException(
            HTTP_403_FORBIDDEN,
            detail="Cannot edit artifact_path, otherwise config history would become inconsistent.",
        )
