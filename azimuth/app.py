# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
import logging
from threading import Event
from typing import Dict, Optional

import structlog
from distributed import SpecCluster
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from starlette.middleware.cors import CORSMiddleware
from starlette.status import HTTP_403_FORBIDDEN, HTTP_404_NOT_FOUND

from azimuth.config import AzimuthConfig, load_azimuth_config
from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.modules.base_classes import DaskModule
from azimuth.modules.utilities.validation import ValidationModule
from azimuth.startup import startup_tasks
from azimuth.task_manager import TaskManager
from azimuth.types import DatasetSplitName, ModuleOptions
from azimuth.utils.cluster import default_cluster
from azimuth.utils.conversion import JSONResponseIgnoreNan
from azimuth.utils.logs import set_logger_config
from azimuth.utils.project import load_dataset_split_managers_from_config, save_config
from azimuth.utils.validation import assert_not_none

_dataset_split_managers: Dict[DatasetSplitName, Optional[DatasetSplitManager]] = {}
_task_manager: Optional[TaskManager] = None
_startup_tasks: Optional[Dict[str, DaskModule]] = None
_azimuth_config: Optional[AzimuthConfig] = None
_ready_flag: Optional[Event] = None


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


def start_app(config_path, debug=False) -> FastAPI:
    """Launch the application's API.

    Args:
        config_path: path to the config
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

    azimuth_config = load_azimuth_config(config_path)
    if azimuth_config.dataset is None:
        raise ValueError("No dataset has been specified in the config.")

    local_cluster = default_cluster(large=azimuth_config.large_dask_cluster)

    run_startup_tasks(azimuth_config, local_cluster)
    assert_not_none(_task_manager).client.run(set_logger_config, level)

    app = create_app()

    log.info("All routes added to router.")

    if debug:
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
    app = FastAPI(
        title="Azimuth API",
        description="Azimuth API",
        version="1.0",
        default_response_class=JSONResponseIgnoreNan,
    )

    # Setup routes
    from azimuth.routers.v1.app import router as app_router
    from azimuth.routers.v1.class_overlap import router as class_overlap_router
    from azimuth.routers.v1.config import router as config_router
    from azimuth.routers.v1.custom_utterances import router as custom_utterances_router
    from azimuth.routers.v1.dataset_warnings import router as dataset_warnings_router
    from azimuth.routers.v1.export import router as export_router
    from azimuth.routers.v1.model_performance.confidence_histogram import (
        router as confidence_histogram_router,
    )
    from azimuth.routers.v1.model_performance.confusion_matrix import (
        router as confusion_matrix_router,
    )
    from azimuth.routers.v1.model_performance.metrics import router as metrics_router
    from azimuth.routers.v1.model_performance.outcome_count import (
        router as outcome_count_router,
    )
    from azimuth.routers.v1.model_performance.utterance_count import (
        router as utterance_count_router,
    )
    from azimuth.routers.v1.top_words import router as top_words_router
    from azimuth.routers.v1.utterances import router as utterances_router
    from azimuth.utils.routers import require_application_ready, require_available_model

    api_router = APIRouter()
    api_router.include_router(app_router, prefix="", tags=["App"])
    api_router.include_router(config_router, prefix="/config", tags=["Config"])
    api_router.include_router(
        class_overlap_router,
        prefix="/dataset_splits/{dataset_split_name}/class_overlap",
        tags=["Class Overlap"],
        dependencies=[Depends(require_application_ready)],
    )
    api_router.include_router(
        confidence_histogram_router,
        prefix="/dataset_splits/{dataset_split_name}/confidence_histogram",
        tags=["Confidence Histogram"],
        dependencies=[Depends(require_application_ready), Depends(require_available_model)],
    )
    api_router.include_router(
        dataset_warnings_router,
        prefix="/dataset_warnings",
        tags=["Dataset Warnings"],
        dependencies=[Depends(require_application_ready)],
    )
    api_router.include_router(
        metrics_router,
        prefix="/dataset_splits/{dataset_split_name}/metrics",
        tags=["Metrics"],
        dependencies=[Depends(require_application_ready), Depends(require_available_model)],
    )
    api_router.include_router(
        outcome_count_router,
        prefix="/dataset_splits/{dataset_split_name}/outcome_count",
        tags=["Outcome Count"],
        dependencies=[Depends(require_application_ready), Depends(require_available_model)],
    )
    api_router.include_router(
        utterance_count_router,
        prefix="/dataset_splits/{dataset_split_name}/utterance_count",
        tags=["Utterance Count"],
        dependencies=[Depends(require_application_ready)],
    )
    api_router.include_router(
        utterances_router,
        prefix="/dataset_splits/{dataset_split_name}/utterances",
        tags=["Utterances"],
        dependencies=[Depends(require_application_ready)],
    )
    api_router.include_router(
        export_router,
        prefix="/export",
        tags=["Export"],
        dependencies=[Depends(require_application_ready)],
    )
    api_router.include_router(
        custom_utterances_router,
        prefix="/custom_utterances",
        tags=["Custom Utterances"],
        dependencies=[Depends(require_application_ready)],
    )
    api_router.include_router(
        top_words_router,
        prefix="/dataset_splits/{dataset_split_name}/top_words",
        tags=["Top Words"],
        dependencies=[Depends(require_application_ready), Depends(require_available_model)],
    )
    api_router.include_router(
        confusion_matrix_router,
        prefix="/dataset_splits/{dataset_split_name}/confusion_matrix",
        tags=["Confusion Matrix"],
        dependencies=[Depends(require_application_ready), Depends(require_available_model)],
    )
    app.include_router(api_router)

    app.add_middleware(
        CORSMiddleware,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    return app


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
        validation_module = ValidationModule(
            config=config,
            dataset_split_name=dataset_split,
            mod_options=ModuleOptions(pipeline_index=pipeline_index),
        )
        validation_module.start_task_on_dataset_split(task_manager.client)
        # Will raise exceptions as needed.
        validation_module.result()

    if config.pipelines is None:
        run_validation_module()
    else:
        for pipeline_index in range(len(config.pipelines)):
            run_validation_module(pipeline_index)
    task_manager.clear_worker_cache()
    task_manager.restart()


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

    save_config(azimuth_config)  # Save only after the validation modules ran successfully

    global _startup_tasks, _ready_flag
    _startup_tasks = startup_tasks(_dataset_split_managers, task_manager)
    _ready_flag = Event()
