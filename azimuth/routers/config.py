# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import Any, Dict

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
from azimuth.utils.cluster import default_cluster
from azimuth.utils.project import update_config

log = structlog.get_logger(__name__)
router = APIRouter()

REQUIRED = "required"


@router.get(
    "/default",
    summary="Get default configuration",
    description="Get the default configuration",
    response_model=AzimuthConfig,
)
def get_default_config_def(
    language: SupportedLanguage = Query(AzimuthConfig.__fields__["language"].default),
) -> AzimuthConfig:
    return AzimuthConfig(
        language=language,
        pipelines=[PipelineDefinition(name=REQUIRED, model=CustomObject(class_name=REQUIRED))],
    )


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
    if attribute_changed_in_config("artifact_path", partial_config, config):
        raise HTTPException(
            HTTP_400_BAD_REQUEST,
            detail="Cannot edit artifact_path, otherwise config history would become inconsistent.",
        )

    try:
        log.info(f"Validating config change with {partial_config}.")
        new_config = update_config(old_config=config, partial_config=partial_config)
        if attribute_changed_in_config("large_dask_cluster", partial_config, config):
            cluster = default_cluster(partial_config["large_dask_cluster"])
        else:
            cluster = task_manager.cluster
        run_startup_tasks(new_config, cluster)
        log.info(f"Config successfully updated with {partial_config}.")
    except Exception as e:
        log.error("Rollback config update due to error", exc_info=e)
        new_config = config
        initialize_managers(new_config, task_manager.cluster)
        log.info("Config update cancelled.")
        if isinstance(e, (AzimuthValidationError, ValidationError)):
            raise HTTPException(HTTP_400_BAD_REQUEST, detail=str(e))
        else:
            raise HTTPException(
                HTTP_500_INTERNAL_SERVER_ERROR, detail="Error when loading the new config."
            )

    return new_config


def attribute_changed_in_config(
    attribute: str, partial_config: Dict[str, Any], config: AzimuthConfig
) -> bool:
    return attribute in partial_config and partial_config[attribute] != getattr(config, attribute)
