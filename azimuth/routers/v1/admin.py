from typing import Dict

import structlog
from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import ValidationError
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_500_INTERNAL_SERVER_ERROR

from azimuth.app import (
    get_config,
    get_task_manager,
    initialize_managers,
    require_unlocked_app,
)
from azimuth.config import AzimuthConfig, AzimuthValidationError
from azimuth.task_manager import TaskManager

log = structlog.get_logger(__name__)
router = APIRouter()

TAGS = ["Admin v1"]


@router.get(
    "/config",
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
    "/config",
    summary="Update config",
    description="Update the config using a changeset.",
    tags=TAGS,
    response_model=AzimuthConfig,
    dependencies=[Depends(require_unlocked_app)],
)
def update_config(
    task_manager: TaskManager = Depends(get_task_manager),
    config: AzimuthConfig = Depends(get_config),
    change_set: Dict = Body(...),
) -> AzimuthConfig:
    try:
        new_config = config.copy(update=change_set, deep=True)
        initialize_managers(new_config, task_manager.cluster)
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
