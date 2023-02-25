# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import Dict

import structlog
from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import ValidationError
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_500_INTERNAL_SERVER_ERROR

from azimuth.app import (
    get_config,
    get_task_manager,
    initialize_managers,
    require_editable_config,
    run_startup_tasks,
)
from azimuth.config import (
    AzimuthConfig,
    AzimuthValidationError,
    CustomObject,
    PipelineDefinition,
    SupportedLanguage,
)
from azimuth.task_manager import TaskManager
from azimuth.utils.project import update_config

log = structlog.get_logger(__name__)
router = APIRouter()

TAGS = ["Config v1"]
REQUIRED = "required"


@router.get(
    "/default",
    summary="Get default configuration",
    description="Get the default configuration",
    response_model=AzimuthConfig,
    tags=TAGS,
)
def get_default_config_def(
    language: SupportedLanguage = Query(AzimuthConfig.__fields__["language"].default),
) -> AzimuthConfig:
    return AzimuthConfig(
        language=language,
        dataset=CustomObject(class_name=REQUIRED),
        pipelines=[PipelineDefinition(name=REQUIRED, model=CustomObject(class_name=REQUIRED))],
    )


@router.get(
    "",
    summary="Get configuration",
    description="Get the current configuration",
    response_model=AzimuthConfig,
    tags=TAGS,
)
def get_config_def(
    config: AzimuthConfig = Depends(get_config),
) -> AzimuthConfig:
    return config


@router.patch(
    "",
    summary="Update config",
    description="Update the config.",
    tags=TAGS,
    response_model=AzimuthConfig,
    dependencies=[Depends(require_editable_config)],
)
def patch_config(
    task_manager: TaskManager = Depends(get_task_manager),
    config: AzimuthConfig = Depends(get_config),
    partial_config: Dict = Body(...),
) -> AzimuthConfig:
    try:
        new_config = update_config(old_config=config, partial_config=partial_config)
        run_startup_tasks(new_config, task_manager.cluster)
    except Exception as e:
        log.error("Rollback config update due to error", exc_info=e)
        new_config = config
        initialize_managers(new_config, task_manager.cluster)
        if isinstance(e, AzimuthValidationError):
            raise HTTPException(HTTP_400_BAD_REQUEST, detail=str(e))
        elif isinstance(e, ValidationError):
            raise HTTPException(HTTP_400_BAD_REQUEST, detail=e.json())
        else:
            raise HTTPException(
                HTTP_500_INTERNAL_SERVER_ERROR, detail="Error when loading the new config."
            )

    # Clear workers so that they load the correct config.
    task_manager.clear_worker_cache()
    return new_config
