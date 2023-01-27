# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import time

import pytest

from azimuth.config import SyntaxConfig
from azimuth.modules.base_classes import AggregationModule, FilterableModule, Module
from azimuth.task_manager import TaskManagerLockedException
from azimuth.types import (
    DatasetSplitName,
    ModuleOptions,
    SupportedMethod,
    SupportedModule,
)


def test_get_all_task(task_manager, tiny_text_config):
    # We can find a task
    key, mod = task_manager.get_task(
        SupportedMethod.Inputs,
        dataset_split_name=DatasetSplitName.eval,
        config=tiny_text_config,
        mod_options=ModuleOptions(pipeline_index=0, indices=[0]),
    )
    assert mod is not None
    # The task can be awaited
    mod.result()

    # The task history is logged
    tasks = task_manager.get_all_tasks_status("Inputs")
    assert len(tasks) == 1

    # We can make a new task!
    key, mod = task_manager.get_task(
        SupportedModule.SyntaxTagging,
        dataset_split_name=DatasetSplitName.eval,
        config=tiny_text_config,
        mod_options=ModuleOptions(indices=[0]),
    )
    assert mod is not None

    # The length stays the same
    assert len(task_manager.get_all_tasks_status("Inputs")) == 1
    assert len(task_manager.get_all_tasks_status("SyntaxTagging")) == 1
    assert len(task_manager.get_all_tasks_status(task=None)) == 2

    # We can get info on the cluster
    info = task_manager.status()
    assert "cluster" in info

    # If we request something that does not exists, it is None
    key, mod = task_manager.get_task("allo", DatasetSplitName.eval, tiny_text_config)
    assert mod is None


def get_module_data(simple_text_config):
    # Dummy module with same config and dataset split.
    mod = Module(DatasetSplitName.eval, simple_text_config)
    return (
        len(mod.artifact_manager.dataset_split_managers_mapping) > 0,
        len(mod.artifact_manager.models_mapping) > 0,
    )


def test_expired_task(task_manager, tiny_text_config):
    class ExpirableModule(FilterableModule[SyntaxConfig]):
        def compute(self, batch):
            return ["ExpirableModule"]

    class NotExpirableModule(AggregationModule[SyntaxConfig]):
        def compute(self, batch):
            return ["NotExpirableModule"]

    current_update = time.time()

    task_manager.register_task("ExpirableModule", ExpirableModule)
    task_manager.register_task("NotExpirableModule", NotExpirableModule)

    _, not_expirable_task = task_manager.get_task(
        "NotExpirableModule",
        dataset_split_name=DatasetSplitName.eval,
        config=tiny_text_config,
        last_update=current_update,
    )
    # Get an expirable task
    _, expirable_task = task_manager.get_task(
        "ExpirableModule",
        dataset_split_name=DatasetSplitName.eval,
        mod_options=ModuleOptions(pipeline_index=0),
        config=tiny_text_config,
        last_update=current_update,
    )
    assert not not_expirable_task.done() and not expirable_task.done()
    _ = expirable_task.wait(), not_expirable_task.wait()

    # If we don't change the time, the task are cached
    _, not_expirable_task = task_manager.get_task(
        "NotExpirableModule",
        dataset_split_name=DatasetSplitName.eval,
        config=tiny_text_config,
        last_update=current_update,
    )
    # Get an expirable task
    _, expirable_task = task_manager.get_task(
        "ExpirableModule",
        dataset_split_name=DatasetSplitName.eval,
        mod_options=ModuleOptions(pipeline_index=0),
        config=tiny_text_config,
        last_update=current_update,
    )
    assert not_expirable_task.done() and expirable_task.done()

    # If we update the dataset_split, the expirable task will be recomputed
    current_update = time.time()
    _, not_expirable_task = task_manager.get_task(
        "NotExpirableModule",
        dataset_split_name=DatasetSplitName.eval,
        config=tiny_text_config,
        last_update=current_update,
    )
    # Get an expirable task
    _, expirable_task = task_manager.get_task(
        "ExpirableModule",
        dataset_split_name=DatasetSplitName.eval,
        mod_options=ModuleOptions(pipeline_index=0),
        config=tiny_text_config,
        last_update=current_update,
    )
    assert not_expirable_task.done() and not expirable_task.done()


def test_lock(task_manager, tiny_text_config):
    assert not task_manager.is_locked
    # Can't unlock a TaskManager that is Unlock
    with pytest.raises(ValueError):
        task_manager.unlock()
    task_manager.lock()
    # Can't lock a TaskManager that is lock
    with pytest.raises(ValueError):
        task_manager.lock()

    # Cant schedule task:
    with pytest.raises(TaskManagerLockedException):
        task_manager.get_task(
            SupportedMethod.Predictions,
            dataset_split_name=DatasetSplitName.eval,
            config=tiny_text_config,
        )
    task_manager.unlock()
    _ = task_manager.get_task(
        SupportedMethod.Predictions,
        dataset_split_name=DatasetSplitName.eval,
        config=tiny_text_config,
        mod_options=ModuleOptions(pipeline_index=0, indices=[0, 1]),
    )


def test_custom_query(
    task_manager,
    tiny_text_config,
):
    _, pred_task = task_manager.get_custom_task(
        SupportedMethod.Predictions,
        custom_query={
            tiny_text_config.columns.text_input: ["hello, this is fred"],
            tiny_text_config.columns.label: [-1],
        },
        config=tiny_text_config,
        mod_options=ModuleOptions(pipeline_index=0),
    )
    assert not pred_task.done()
    result = pred_task.result()
    assert len(result) == 1
    # Wait for callbacks
    pred_task.wait()
    # Check that we have the same module
    _, pred_task2 = task_manager.get_custom_task(
        SupportedMethod.Predictions,
        custom_query={
            tiny_text_config.columns.text_input: ["hello, this is fred"],
            tiny_text_config.columns.label: [-1],
        },
        config=tiny_text_config,
        mod_options=ModuleOptions(pipeline_index=0),
    )
    assert pred_task2 is pred_task
