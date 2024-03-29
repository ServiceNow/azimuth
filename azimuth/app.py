# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
import logging
from threading import Event
from typing import Dict, Optional

import structlog
from distributed import SpecCluster
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ValidationError
from starlette.middleware.cors import CORSMiddleware
from starlette.status import (
    HTTP_400_BAD_REQUEST,
    HTTP_401_UNAUTHORIZED,
    HTTP_403_FORBIDDEN,
    HTTP_404_NOT_FOUND,
    HTTP_422_UNPROCESSABLE_ENTITY,
    HTTP_503_SERVICE_UNAVAILABLE,
)

from azimuth.config import AzimuthConfig, load_azimuth_config
from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.modules.base_classes import ArtifactManager, DaskModule
from azimuth.startup import startup_tasks
from azimuth.task_manager import TaskManager
from azimuth.types import DatasetSplitName, ModuleOptions, SupportedModule
from azimuth.utils.cluster import default_cluster
from azimuth.utils.conversion import JSONResponseIgnoreNan
from azimuth.utils.exception_handlers import handle_validation_error
from azimuth.utils.logs import set_logger_config
from azimuth.utils.validation import assert_not_none

_dataset_split_managers: Dict[DatasetSplitName, Optional[DatasetSplitManager]] = {}
_task_manager: Optional[TaskManager] = None
_startup_tasks: Optional[Dict[str, DaskModule]] = None
_azimuth_config: Optional[AzimuthConfig] = None
_ready_flag: Optional[Event] = None


COMMON_HTTP_ERROR_CODES = (
    HTTP_400_BAD_REQUEST,
    HTTP_401_UNAUTHORIZED,
    HTTP_403_FORBIDDEN,
    HTTP_404_NOT_FOUND,
    # The default handler for RequestValidationError was returning an HTTP_422_UNPROCESSABLE_ENTITY.
    # We overwrite that handler with the following handle_validation_error(), which returns more
    # conventional HTTP codes.
    # This overwrites the default ValidationError response for 422 in the OpenAPI spec.
    HTTP_422_UNPROCESSABLE_ENTITY,
    HTTP_503_SERVICE_UNAVAILABLE,
)


class HTTPExceptionModel(BaseModel):
    detail: str


def get_dataset_split_manager_mapping() -> Dict[DatasetSplitName, Optional[DatasetSplitManager]]:
    return _dataset_split_managers


def get_all_dataset_split_managers() -> Dict[DatasetSplitName, Optional[DatasetSplitManager]]:
    dm_eval = _dataset_split_managers.get(DatasetSplitName.eval)
    dm_train = _dataset_split_managers.get(DatasetSplitName.train)

    if dm_train is None or dm_eval is None:
        raise HTTPException(HTTP_404_NOT_FOUND, detail="Dataset split not found.")

    return _dataset_split_managers


def get_dataset_split_manager(dataset_split_name: DatasetSplitName) -> DatasetSplitManager:
    dm = _dataset_split_managers.get(dataset_split_name)
    if dm is None:
        raise HTTPException(HTTP_404_NOT_FOUND, detail="Dataset split not found.")

    return dm


def get_task_manager() -> Optional[TaskManager]:
    return _task_manager


def get_startup_tasks() -> Optional[Dict[str, DaskModule]]:
    return _startup_tasks


def get_ready_flag() -> Optional[Event]:
    return _ready_flag


def get_config() -> Optional[AzimuthConfig]:
    return _azimuth_config


def require_editable_config(config: AzimuthConfig = Depends(get_config)):
    if config.read_only_config:
        raise HTTPException(HTTP_403_FORBIDDEN, detail="The Azimuth config is currently read-only.")


def start_app(config_path: Optional[str], load_config_history: bool, debug: bool) -> FastAPI:
    """Launch the application's API.

    Args:
        config_path: path to the config
        load_config_history: Load the last config from history, or if empty, default to config_path.
        debug: Debug flag

    Returns:
        API.

    Raises:
        ValueError: If no dataset_split in config.
    """
    global _dataset_split_managers, _task_manager, _startup_tasks, _azimuth_config, _ready_flag

    level = logging.DEBUG if debug else logging.INFO
    set_logger_config(level)

    log = structlog.get_logger(__name__)

    log.info("🔭 Azimuth starting 🔭")

    azimuth_config = load_azimuth_config(config_path, load_config_history)

    local_cluster = default_cluster(large=azimuth_config.large_dask_cluster)

    run_startup_tasks(azimuth_config, local_cluster)
    task_manager = assert_not_none(_task_manager)
    task_manager.client.run(set_logger_config, level)

    app = create_app()

    log.info("All routes added to router.")

    if debug:
        log.debug(f"See Dask dashboard at {task_manager.client.dashboard_link}.")
        for r in app.router.routes:
            log.debug("Route", methods=r.__dict__.get("methods"), path=r.__dict__["path"])

    @app.on_event("shutdown")
    def shutdown_event():
        if _task_manager:
            _task_manager.close()
            _task_manager.cluster.close()

    return app


def create_app() -> FastAPI:
    """Create the FastAPI.

    Returns:
        FastAPI.
    """
    api = FastAPI(
        title="Azimuth API",
        description="Azimuth API",
        version="1.0",
        default_response_class=JSONResponseIgnoreNan,
        responses={code: {"model": HTTPExceptionModel} for code in COMMON_HTTP_ERROR_CODES},
        exception_handlers={
            ValidationError: handle_validation_error,  # for PATCH "/config",
            # where we call old_config.copy(update=partial_config, deep=True) ourselves.
            RequestValidationError: handle_validation_error,
        },
        root_path=".",  # Tells Swagger UI and ReDoc to fetch the OpenAPI spec from ./openapi.json
        # (relative) so it works through the front-end proxy.
    )

    # Setup routes
    from azimuth.routers import (
        app,
        class_overlap,
        config,
        custom_utterances,
        dataset_warnings,
        export,
        top_words,
        utterances,
    )
    from azimuth.routers.model_performance import (
        confidence_histogram,
        confusion_matrix,
        metrics,
        outcome_count,
        utterance_count,
    )
    from azimuth.utils.routers import require_application_ready, require_available_model

    api_router = APIRouter()
    api_router.include_router(app.router, prefix="", tags=["App"])
    api_router.include_router(config.router, prefix="/config", tags=["Config"])
    api_router.include_router(
        class_overlap.router,
        prefix="/dataset_splits/{dataset_split_name}/class_overlap",
        tags=["Class Overlap"],
        dependencies=[Depends(require_application_ready)],
    )
    api_router.include_router(
        confidence_histogram.router,
        prefix="/dataset_splits/{dataset_split_name}/confidence_histogram",
        tags=["Confidence Histogram"],
        dependencies=[Depends(require_application_ready), Depends(require_available_model)],
    )
    api_router.include_router(
        dataset_warnings.router,
        prefix="/dataset_warnings",
        tags=["Dataset Warnings"],
        dependencies=[Depends(require_application_ready)],
    )
    api_router.include_router(
        metrics.router,
        prefix="/dataset_splits/{dataset_split_name}/metrics",
        tags=["Metrics"],
        dependencies=[Depends(require_application_ready), Depends(require_available_model)],
    )
    api_router.include_router(
        outcome_count.router,
        prefix="/dataset_splits/{dataset_split_name}/outcome_count",
        tags=["Outcome Count"],
        dependencies=[Depends(require_application_ready), Depends(require_available_model)],
    )
    api_router.include_router(
        utterance_count.router,
        prefix="/dataset_splits/{dataset_split_name}/utterance_count",
        tags=["Utterance Count"],
        dependencies=[Depends(require_application_ready)],
    )
    api_router.include_router(
        utterances.router,
        prefix="/dataset_splits/{dataset_split_name}/utterances",
        tags=["Utterances"],
        dependencies=[Depends(require_application_ready)],
    )
    api_router.include_router(
        export.router,
        prefix="/export",
        tags=["Export"],
        dependencies=[Depends(require_application_ready)],
    )
    api_router.include_router(
        custom_utterances.router,
        prefix="/custom_utterances",
        tags=["Custom Utterances"],
        dependencies=[Depends(require_application_ready)],
    )
    api_router.include_router(
        top_words.router,
        prefix="/dataset_splits/{dataset_split_name}/top_words",
        tags=["Top Words"],
        dependencies=[Depends(require_application_ready), Depends(require_available_model)],
    )
    api_router.include_router(
        confusion_matrix.router,
        prefix="/dataset_splits/{dataset_split_name}/confusion_matrix",
        tags=["Confusion Matrix"],
        dependencies=[Depends(require_application_ready), Depends(require_available_model)],
    )
    api.include_router(api_router)

    api.add_middleware(
        CORSMiddleware,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    return api


def load_dataset_split_managers_from_config(
    azimuth_config: AzimuthConfig,
) -> Dict[DatasetSplitName, Optional[DatasetSplitManager]]:
    """
    Load all dataset splits for the application.

    Args:
        azimuth_config: Azimuth Configuration.

    Returns:
        For all DatasetSplitName, None or a dataset_split manager.

    """
    artifact_manager = ArtifactManager.instance()
    dataset = artifact_manager.get_dataset_dict(azimuth_config)

    return {
        dataset_split_name: None
        if dataset_split_name not in dataset
        else artifact_manager.get_dataset_split_manager(
            azimuth_config, DatasetSplitName[dataset_split_name]
        )
        for dataset_split_name in [DatasetSplitName.eval, DatasetSplitName.train]
    }


def initialize_managers(azimuth_config: AzimuthConfig, cluster: SpecCluster):
    """Initialize DatasetSplitManagers and TaskManagers.


    Args:
        azimuth_config: Configuration
        cluster: Dask cluster to use.
    """
    global _task_manager, _dataset_split_managers, _azimuth_config
    _azimuth_config = azimuth_config
    if _task_manager is not None:
        task_history = _task_manager.current_tasks
    else:
        task_history = {}

    _task_manager = TaskManager(azimuth_config, cluster=cluster)

    _task_manager.current_tasks = task_history

    _dataset_split_managers = load_dataset_split_managers_from_config(azimuth_config)


def run_validation(
    dataset_split: DatasetSplitName, task_manager: TaskManager, config: AzimuthConfig
):
    """Run validation module on the specified split.

    Args:
        dataset_split: Which split to run on.
        task_manager: Task Manager to use
        config: Current config.

    Raises:
        MultipleException if the validation failed.
    """

    def run_validation_module(pipeline_index=None):
        _, task = task_manager.get_task(
            task_name=SupportedModule.Validation,
            dataset_split_name=dataset_split,
            mod_options=ModuleOptions(pipeline_index=pipeline_index),
        )
        # Will raise exceptions as needed.
        task.result()

    if config.pipelines is None:
        run_validation_module()
    else:
        for pipeline_index in range(len(config.pipelines)):
            run_validation_module(pipeline_index)


def run_startup_tasks(azimuth_config: AzimuthConfig, cluster: SpecCluster):
    """Initialize managers, run validation and startup tasks.

    Args:
        azimuth_config: Config
        cluster: Cluster

    """
    initialize_managers(azimuth_config, cluster)

    task_manager = assert_not_none(get_task_manager())
    # Validate that everything is in order **before** the startup tasks.
    if _dataset_split_managers.get(DatasetSplitName.train):
        run_validation(DatasetSplitName.train, task_manager, azimuth_config)
    if _dataset_split_managers.get(DatasetSplitName.eval):
        run_validation(DatasetSplitName.eval, task_manager, azimuth_config)

    azimuth_config.save()  # Save only after the validation modules ran successfully

    global _startup_tasks, _ready_flag
    _startup_tasks = startup_tasks(_dataset_split_managers, task_manager)
    _ready_flag = Event()
