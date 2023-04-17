# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
import threading
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import structlog
from distributed import Future

from azimuth.config import AzimuthConfig
from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.modules.base_classes import DaskModule, DatasetResultModule
from azimuth.task_manager import TaskManager
from azimuth.types import (
    DatasetSplitName,
    ModuleOptions,
    SupportedMethod,
    SupportedModule,
    SupportedTask,
)
from azimuth.utils.project import (
    perturbation_testing_available,
    postprocessing_editable,
    predictions_available,
    saliency_available,
    similarity_available,
)
from azimuth.utils.validation import assert_not_none

log = structlog.get_logger()


@dataclass
class Startup:
    name: str  # TODO Improve: A name cannot be a substring of any other names.
    module: SupportedTask
    mod_options: Dict = field(default_factory=dict)
    # The names of other start-up tasks to wait for.
    dependency_names: List[str] = field(default_factory=list)
    run_on_all_pipelines: bool = False
    dataset_split_names: List[DatasetSplitName] = field(
        default_factory=lambda: [DatasetSplitName.train, DatasetSplitName.eval]
    )


START_UP_THREAD_NAME = "Azimuth_Startup"

SIMILARITY_TASKS = [
    Startup("faiss", SupportedModule.FAISS),
    Startup("neighbors_tags", SupportedModule.NeighborsTagging, dependency_names=["faiss"]),
    Startup(
        "class_overlap",
        SupportedModule.ClassOverlap,
        dependency_names=["neighbors_tags"],
        dataset_split_names=[DatasetSplitName.train],
    ),
]

BMA_PREDICTION_TASKS = [
    Startup(
        "prediction_bma",
        SupportedMethod.Predictions,
        mod_options={"use_bma": True},
        run_on_all_pipelines=True,
    )
]

PERTURBATION_TESTING_TASKS = [
    Startup(
        "perturbation_testing",
        SupportedModule.PerturbationTesting,
        dependency_names=["prediction"],
        run_on_all_pipelines=True,
    ),
    Startup(
        "perturbation_testing_summary",
        SupportedModule.PerturbationTestingSummary,
        dependency_names=["perturbation_testing"],
        run_on_all_pipelines=True,
        dataset_split_names=[DatasetSplitName.all],
    ),
]

PIPELINE_COMPARISON_TASKS = [
    Startup(
        "prediction_comparison",
        SupportedModule.PredictionComparison,
        dependency_names=["prediction"],
    )
]

POSTPROCESSING_TASKS = [
    Startup(
        "outcome_count_per_threshold",
        SupportedModule.OutcomeCountPerThreshold,
        dependency_names=["prediction", "outcome"],
        run_on_all_pipelines=True,
        dataset_split_names=[DatasetSplitName.eval],
    )
]

SALIENCY_TASKS = [
    Startup("saliency", SupportedMethod.Saliency, run_on_all_pipelines=True),
]

BASE_PREDICTION_TASKS = [
    Startup("predictions", SupportedMethod.Predictions, run_on_all_pipelines=True),
    Startup(
        "outcomes",
        SupportedModule.Outcome,
        dependency_names=["predictions"],
        run_on_all_pipelines=True,
    ),
    Startup(
        "confidence_bins",
        SupportedModule.ConfidenceBinIndex,
        dependency_names=["predictions"],
        run_on_all_pipelines=True,
    ),
]

PER_FILTER_TASKS = [
    Startup(
        "metrics_by_filter",
        SupportedModule.MetricsPerFilter,
        dependency_names=[
            "predictions",
            "outcomes",
            "prediction_comparison",
            "perturbation_testing",
            "neighbors_tags",
            "prediction_bma",
            "syntax_tags",
        ],
        run_on_all_pipelines=True,
    )
]


def on_end(fut: Future, module: DaskModule, dm: DatasetSplitManager, task_manager: TaskManager):
    """This is a callback that will be run at the end of the computation.

    Args:
        fut: Future of the module.
        module: DaskModule.
        dm: DatasetSplitManager in which to save the results.
        task_manager: Task Manager.
    """
    if fut.status == "finished":
        # Task is done, save the result.
        if isinstance(module, DatasetResultModule):
            module.save_result(module.result(), dm)
            # We only need to clear cache when the dataset is modified.
            task_manager.clear_worker_cache()
    else:
        log.exception("Error in", module=module, fut=fut, exc_info=fut.exception())


def make_startup_tasks(
    dataset_split_managers: Dict[DatasetSplitName, Optional[DatasetSplitManager]],
    task_manager: TaskManager,
    supported_module: SupportedTask,
    mod_options: Dict,
    dependencies: List[DaskModule],
    pipeline_index: Optional[int],
    dataset_split_names: List[DatasetSplitName],
) -> Dict[DatasetSplitName, DaskModule]:
    """
    Apply `module` on all indices of all dataset split names and call `save_results` at the end.

    Args:
        dataset_split_managers: loaded dataset_split_managers.
        task_manager: Initialized task managers.
        supported_module: A Module to instantiate.
        mod_options: Special kwargs for the Module.
        dependencies: Which modules to include as dependency.
        pipeline_index: On which pipeline to run the startup task.
        dataset_split_names: List of DatasetSplitName on which to run the task.

    Returns:
        Named Modules with the tasks.

    """

    available_dms = {k: v for k, v in dataset_split_managers.items() if v is not None}
    available_dms_with_all: Dict[DatasetSplitName, Optional[DatasetSplitManager]] = {
        **available_dms,
        DatasetSplitName.all: None,
    }
    tasks: Dict[DatasetSplitName, DaskModule] = {}

    for dataset_split_name, dm in available_dms_with_all.items():
        if dataset_split_name not in dataset_split_names:
            continue
        _, maybe_task = task_manager.get_task(
            task_name=supported_module,
            dataset_split_name=dataset_split_name,
            dependencies=dependencies,
            mod_options=ModuleOptions(pipeline_index=pipeline_index, **mod_options),
        )
        task = assert_not_none(maybe_task)
        task_launched = task.future is not None
        if task_launched:
            task.add_done_callback(on_end, dm=dm, task_manager=task_manager)
        # If the task is not launched (because it is cached), we save the module cached results in
        # the dataset, so that it contains the relevant data associated with the config.
        elif isinstance(task, DatasetResultModule):
            task.save_result(task.result(), assert_not_none(dm))
        tasks[dataset_split_name] = task
    return tasks


def get_modules(module_objects: Dict[str, DaskModule], deps_name: List[str]):
    # Get all modules where the name is a substring of any dependency.
    return [v for k, v in module_objects.items() if any(d in k for d in deps_name)]


def startup_tasks(
    dataset_split_managers: Dict[DatasetSplitName, Optional[DatasetSplitManager]],
    task_manager: TaskManager,
) -> Dict[str, DaskModule]:
    """Create and launch all startup tasks.

    Args:
        dataset_split_managers: Dataset Managers.
        task_manager: Task Manager.

    Returns:
        Modules with their names.

    """
    config = task_manager.config
    # The order in start_up_tasks matters; a task needs to be added after its dependencies.
    # TODO Refactor so the startup can be robust to the order in start_up_tasks.
    start_up_tasks = [
        Startup("syntax_tags", SupportedModule.SyntaxTagging),
    ]
    if similarity_available(config):
        start_up_tasks += SIMILARITY_TASKS
    if predictions_available(config):
        start_up_tasks += BASE_PREDICTION_TASKS
        if perturbation_testing_available(config):
            start_up_tasks += PERTURBATION_TESTING_TASKS
        if config.uncertainty.iterations > 1:
            start_up_tasks += BMA_PREDICTION_TASKS
        if config.pipelines is not None and len(config.pipelines) > 1:
            start_up_tasks += PIPELINE_COMPARISON_TASKS
        # TODO We only check pipeline_index=0, but we should check all pipelines.
        if postprocessing_editable(config, 0):
            start_up_tasks += POSTPROCESSING_TASKS
        if saliency_available(config):
            start_up_tasks += SALIENCY_TASKS
        start_up_tasks += PER_FILTER_TASKS

    mods = start_tasks_for_dms(config, dataset_split_managers, task_manager, start_up_tasks)

    # Start a thread to monitor the status.
    th = threading.Thread(
        target=wait_for_startup, args=(mods, task_manager), name=START_UP_THREAD_NAME
    )
    th.setDaemon(True)
    th.start()

    return mods


def start_tasks_for_dms(
    config: AzimuthConfig,
    dataset_split_managers: Dict[DatasetSplitName, Optional[DatasetSplitManager]],
    task_manager: TaskManager,
    tasks: List[Startup],
) -> Dict[str, DaskModule]:
    """Start `tasks` for all `dataset_splits_managers`.

    Args:
        config: App config
        dataset_split_managers: DatasetSplitManager to run the module on.
        task_manager: TaskManager to launch tasks with.
        tasks: Which tasks to run.

    Returns:
        Dict[name, DaskModule] for all tasks.
    """
    mods: Dict[str, DaskModule] = {}
    for startup in tasks:
        if startup.run_on_all_pipelines and config.pipelines is None:
            raise ValueError(f"{startup.name} requires pipelines, but none provided in config.")
        if startup.run_on_all_pipelines:
            config_pipelines = assert_not_none(config.pipelines)
            pipeline_indices: List[Optional[int]] = list(range(len(config_pipelines)))
        else:
            pipeline_indices = [None]

        for pipeline_index in pipeline_indices:
            dep_mods = get_modules(mods, startup.dependency_names)
            mods.update(
                {
                    f"{startup.name}_{k.value}_{pipeline_index or ''}".rstrip("_"): v
                    for k, v in make_startup_tasks(
                        dataset_split_managers,
                        task_manager,
                        startup.module,
                        mod_options=startup.mod_options,
                        dependencies=dep_mods,
                        pipeline_index=pipeline_index,
                        dataset_split_names=startup.dataset_split_names,
                    ).items()
                }
            )
    return mods


def wait_for_startup(startup_mods: Dict[str, DaskModule], task_manager: TaskManager):
    """Wait for all startup tasks and restart the Cluster after.

    Notes:
        We lock the TaskManager because if we start a new Module and then restart the
        TaskManager, this Module will be cancelled and lost. To prevent this, we wont allow new
        Module till the TaskManager is restarted.

    Args:
        startup_mods: Key-value pair of the named Modules.
        task_manager: Current TaskManager.

    """
    start_time = time.time()
    task_manager.lock()  # Lock the TaskManager to prevent new tasks.
    while not all(m.done() for m in startup_mods.values()):
        time.sleep(30)  # We wait to not spam the user with logs.
        is_done = {k: v.done() for k, v in startup_mods.items()}
        per_status = defaultdict(list)
        for name, mod in startup_mods.items():
            status = "saving" if mod.status() == "finished" and not mod.done() else mod.status()
            per_status[status].append(name)
        log.info(f"Startup tasks statuses: {sum(is_done.values())}/{len(is_done)}")
        for status, modules in per_status.items():
            log.info(f"{status} ({len(modules)}): {', '.join(modules)}")

    log.info("Startup task completed. The application should be accessible now.")
    log.debug(f"Startup took {time.time() - start_time}.")

    if errored_modules := [
        name for name, module in startup_mods.items() if module.status() == "error"
    ]:
        log.error(
            f"Error(s) at startup! The application could be unstable {errored_modules}."
            f" You may try to relaunch the app."
        )

    # Cleaning stuff up otherwise we hold too much in memory.
    task_manager.restart()
    # After restarting, it is safe to unlock the task manager.
    task_manager.unlock()
    log.info("Cluster restarted to free memory.")
