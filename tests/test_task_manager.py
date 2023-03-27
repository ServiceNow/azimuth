# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import time

import pytest

from azimuth.config import SyntaxConfig
from azimuth.modules.base_classes import AggregationModule, FilterableModule, Module
from azimuth.task_manager import TaskManager, TaskManagerLockedException
from azimuth.types import (
    DatasetSplitName,
    ModuleOptions,
    SupportedMethod,
    SupportedModule,
)


def test_get_all_task(tiny_text_task_manager):
    # We can find a task
    key, mod = tiny_text_task_manager.get_task(
        SupportedMethod.Inputs,
        dataset_split_name=DatasetSplitName.eval,
        mod_options=ModuleOptions(pipeline_index=0, indices=[0]),
    )
    assert mod is not None
    # The task can be awaited
    mod.result()

    # The task history is logged
    tasks = tiny_text_task_manager.get_all_tasks_status("Inputs")
    assert len(tasks) == 1

    # We can make a new task!
    key, mod = tiny_text_task_manager.get_task(
        SupportedModule.SyntaxTagging,
        dataset_split_name=DatasetSplitName.eval,
        mod_options=ModuleOptions(indices=[0]),
    )
    assert mod is not None

    # The length stays the same
    assert len(tiny_text_task_manager.get_all_tasks_status("Inputs")) == 1
    assert len(tiny_text_task_manager.get_all_tasks_status("SyntaxTagging")) == 1
    assert len(tiny_text_task_manager.get_all_tasks_status(task=None)) == 2

    # We can get info on the cluster
    info = tiny_text_task_manager.status()
    assert "cluster" in info

    # If we request something that does not exists, it is None
    key, mod = tiny_text_task_manager.get_task("allo", dataset_split_name=DatasetSplitName.eval)
    assert mod is None


def get_module_data(simple_text_config):
    # Dummy module with same config and dataset split.
    mod = Module(DatasetSplitName.eval, simple_text_config)
    return (
        len(mod.artifact_manager.dataset_split_managers_mapping) > 0,
        len(mod.artifact_manager.models_mapping) > 0,
    )


def test_clearing_cache(tiny_text_config):
    task_manager = TaskManager(tiny_text_config)

    key, mod = task_manager.get_task(
        SupportedMethod.Predictions,
        dataset_split_name=DatasetSplitName.eval,
        mod_options=ModuleOptions(pipeline_index=0, indices=[0, 1]),
    )
    assert mod is not None
    # The task can be awaited
    mod.result()

    # The cache is populated somewhere
    cached = task_manager.client.run(get_module_data, tiny_text_config)
    assert any([m and d for m, d in cached.values()])

    task_manager.clear_worker_cache()

    # The cache is cleared somewhere
    cached = task_manager.client.run(get_module_data, tiny_text_config)
    assert not any([m and d for m, d in cached.values()])


def test_expired_task(tiny_text_task_manager, tiny_text_config):
    class ExpirableModule(FilterableModule[SyntaxConfig]):
        def compute(self, batch):
            return ["ExpirableModule"]

    class NotExpirableModule(AggregationModule[SyntaxConfig]):
        def compute(self, batch):
            return ["NotExpirableModule"]

    current_update = time.time()

    tiny_text_task_manager.register_task("ExpirableModule", ExpirableModule)
    tiny_text_task_manager.register_task("NotExpirableModule", NotExpirableModule)

    _, not_expirable_task = tiny_text_task_manager.get_task(
        "NotExpirableModule",
        dataset_split_name=DatasetSplitName.eval,
        last_update=current_update,
    )
    # Get an expirable task
    _, expirable_task = tiny_text_task_manager.get_task(
        "ExpirableModule",
        dataset_split_name=DatasetSplitName.eval,
        mod_options=ModuleOptions(pipeline_index=0),
        last_update=current_update,
    )
    assert not not_expirable_task.done() and not expirable_task.done()
    _ = expirable_task.wait(), not_expirable_task.wait()

    # If we don't change the time, the task are cached
    _, not_expirable_task = tiny_text_task_manager.get_task(
        "NotExpirableModule",
        dataset_split_name=DatasetSplitName.eval,
        last_update=current_update,
    )
    # Get an expirable task
    _, expirable_task = tiny_text_task_manager.get_task(
        "ExpirableModule",
        dataset_split_name=DatasetSplitName.eval,
        mod_options=ModuleOptions(pipeline_index=0),
        last_update=current_update,
    )
    assert not_expirable_task.done() and expirable_task.done()

    # If we update the dataset_split, the expirable task will be recomputed
    current_update = time.time()
    _, not_expirable_task = tiny_text_task_manager.get_task(
        "NotExpirableModule",
        dataset_split_name=DatasetSplitName.eval,
        last_update=current_update,
    )
    # Get an expirable task
    _, expirable_task = tiny_text_task_manager.get_task(
        "ExpirableModule",
        dataset_split_name=DatasetSplitName.eval,
        mod_options=ModuleOptions(pipeline_index=0),
        last_update=current_update,
    )
    assert not_expirable_task.done() and not expirable_task.done()


def test_lock(tiny_text_task_manager):
    assert not tiny_text_task_manager.is_locked
    # Can't unlock a TaskManager that is Unlock
    with pytest.raises(ValueError):
        tiny_text_task_manager.unlock()
    tiny_text_task_manager.lock()
    # Can't lock a TaskManager that is lock
    with pytest.raises(ValueError):
        tiny_text_task_manager.lock()

    # Cant schedule task:
    with pytest.raises(TaskManagerLockedException):
        tiny_text_task_manager.get_task(
            SupportedMethod.Predictions,
            dataset_split_name=DatasetSplitName.eval,
        )
    tiny_text_task_manager.unlock()
    _ = tiny_text_task_manager.get_task(
        SupportedMethod.Predictions,
        dataset_split_name=DatasetSplitName.eval,
        mod_options=ModuleOptions(pipeline_index=0, indices=[0, 1]),
    )


def test_custom_query(tiny_text_task_manager):
    _, pred_task = tiny_text_task_manager.get_custom_task(
        SupportedMethod.Predictions,
        custom_query={
            tiny_text_task_manager.config.columns.text_input: ["hello, this is fred"],
            tiny_text_task_manager.config.columns.label: [-1],
        },
        mod_options=ModuleOptions(pipeline_index=0),
    )
    assert not pred_task.done()
    result = pred_task.result()
    assert len(result) == 1
    # Wait for callbacks
    pred_task.wait()
    # Check that we have the same module
    _, pred_task2 = tiny_text_task_manager.get_custom_task(
        SupportedMethod.Predictions,
        custom_query={
            tiny_text_task_manager.config.columns.text_input: ["hello, this is fred"],
            tiny_text_task_manager.config.columns.label: [-1],
        },
        mod_options=ModuleOptions(pipeline_index=0),
    )
    assert pred_task2 is pred_task
