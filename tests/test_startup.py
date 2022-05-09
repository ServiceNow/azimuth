# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from unittest.mock import Mock

import pytest
from datasets import Dataset, DatasetDict

from azimuth.app import get_ready_flag, initialize_managers
from azimuth.config import CustomObject
from azimuth.modules.model_contracts import HFTextClassificationModule
from azimuth.startup import on_end, startup_tasks
from azimuth.types import (
    DatasetSplitName,
    ModuleOptions,
    SupportedMethod,
    SupportedModule,
)
from azimuth.utils.project import load_dataset_split_managers_from_config
from tests.utils import get_table_key


def test_startup_task(tiny_text_config, tiny_text_task_manager):
    dms = load_dataset_split_managers_from_config(tiny_text_config)
    mods = startup_tasks(dms, tiny_text_task_manager)
    one_mod = mods["syntax_tags_eval_None"]
    # We lock the task manager
    assert tiny_text_task_manager.is_locked
    assert not one_mod.done()
    assert all("train" in k or "eval" in k for k in mods.keys())
    assert all(
        on_end in [cbk.fn for cbk in mod._callbacks] for mod in mods.values()
    ), "Some modules dont have callbacks!"


def test_startup_task_fast(tiny_text_config, tiny_text_task_manager):
    tiny_text_config.behavioral_testing = None
    tiny_text_config.similarity = None
    dms = load_dataset_split_managers_from_config(tiny_text_config)
    mods = startup_tasks(dms, tiny_text_task_manager)

    assert not any(
        mod.task_name in (SupportedModule.PerturbationTesting, SupportedModule.NeighborsTagging)
        for mod in mods.values()
    )


def test_on_end(tiny_text_config):
    dms = load_dataset_split_managers_from_config(tiny_text_config)
    # Test that the dataset_split manager is called.
    mod = HFTextClassificationModule(
        dataset_split_name=DatasetSplitName.eval,
        config=tiny_text_config,
        mod_options=ModuleOptions(
            pipeline_index=0,
            model_contract_method_name=SupportedMethod.Predictions,
            indices=[0, 1],
        ),
    )
    res = mod.compute_on_dataset_split()
    mod = Mock(HFTextClassificationModule)
    mod.result = Mock(return_value=res)
    mocked_fut = Mock()
    mocked_fut.status = "finished"
    task_manager = Mock()
    on_end(mocked_fut, mod, dm=dms[DatasetSplitName.eval], task_manager=task_manager)
    mod.save_result.assert_called_once()
    task_manager.clear_worker_cache.assert_called_once()


def test_startup_task_no_train(tiny_text_config_no_train, tiny_text_task_manager):
    dms = load_dataset_split_managers_from_config(tiny_text_config_no_train)
    assert DatasetSplitName.eval in dms and DatasetSplitName.train in dms

    mods = startup_tasks(dms, tiny_text_task_manager)
    assert all("train" not in k or "eval" in k for k in mods.keys())
    assert all(
        on_end in [cbk.fn for cbk in mod._callbacks] for mod in mods.values()
    ), "Some modules dont have callbacks!"


@pytest.mark.parametrize("iterations", [20, 1])
def test_startup_task_bma(tiny_text_config, tiny_text_task_manager, iterations):
    tiny_text_config.uncertainty.iterations = iterations
    dms = load_dataset_split_managers_from_config(tiny_text_config)
    mods = startup_tasks(dms, tiny_text_task_manager)

    # Check that we have BMA at some point if iterations > 1
    if iterations == 1:
        assert all("bma" not in mod_name for mod_name in mods.keys())
    else:
        assert any("bma" in mod_name for mod_name in mods.keys())


def test_initialize_backbone(tiny_text_config, dask_client):
    from azimuth.app import (
        get_config,
        get_dataset_split_manager,
        get_startup_tasks,
        get_task_manager,
    )

    event = get_ready_flag()
    assert event is None
    assert get_startup_tasks() is None
    initialize_managers(tiny_text_config, cluster=dask_client.cluster)
    assert get_task_manager().cluster is dask_client.cluster
    assert get_config() is tiny_text_config
    assert get_dataset_split_manager(DatasetSplitName.train).config is tiny_text_config
    assert get_dataset_split_manager(DatasetSplitName.eval).config is tiny_text_config
    assert len(get_startup_tasks()) > 0
    assert not get_ready_flag().is_set()


def my_dataset_fn(valid):
    ds = {
        "train": Dataset.from_dict({"utterance": ["a", "b", "c"], "label": ["1", "2", "3"]}),
        "test": Dataset.from_dict({"utterance": ["h", "i", "j"], "label": ["7", "8", "9"]}),
    }
    if valid:
        ds["validation"] = Dataset.from_dict(
            {"utterance": ["d", "e", "f"], "label": ["4", "5", "6"]}
        )
    return DatasetDict(ds).class_encode_column("label")


def test_validation_priority(simple_text_config):
    simple_text_config.dataset = CustomObject(
        **{"class_name": "tests.test_modules.test_module.my_dataset_fn", "kwargs": {"valid": True}}
    )
    simple_table_key = get_table_key(simple_text_config)
    ds = load_dataset_split_managers_from_config(simple_text_config)[
        DatasetSplitName.eval
    ].get_dataset_split(simple_table_key)
    assert ds["utterance"] == ["d", "e", "f"]

    # Otherwise, we take validation
    simple_text_config.dataset = CustomObject(
        **{"class_name": "tests.test_modules.test_module.my_dataset_fn", "kwargs": {"valid": False}}
    )
    ds = load_dataset_split_managers_from_config(simple_text_config)[
        DatasetSplitName.eval
    ].get_dataset_split(simple_table_key)
    assert ds["utterance"] == ["h", "i", "j"]
