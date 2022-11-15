# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import time

import pytest
from datasets import Dataset, DatasetDict
from distributed import Variable

from azimuth.config import CustomObject
from azimuth.modules.base_classes import AggregationModule, IndexableModule, Module
from azimuth.modules.model_contracts import HFTextClassificationModule
from azimuth.types import DatasetSplitName, ModuleOptions, SupportedMethod


def test_ds_loading(simple_text_config):
    mod = Module(DatasetSplitName.eval, config=simple_text_config)
    ds = mod.get_dataset_split()
    assert isinstance(ds, Dataset)
    assert len(ds) >= 1

    config_key = mod.config.to_hash()
    assert len(mod.artifact_manager.dataset_split_managers_mapping[config_key]) == 1
    mod.clear_cache()
    assert mod.artifact_manager.dataset_split_managers_mapping.get(config_key) is None


def test_model_loading(simple_text_config):
    mod = HFTextClassificationModule(
        DatasetSplitName.eval,
        config=simple_text_config,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Inputs, pipeline_index=0
        ),
    )
    model = mod.get_model()
    assert callable(model)


def test_threshold(simple_text_config):
    # by default, only ModelContractModules are affected by thresholds.
    assert (
        HFTextClassificationModule(
            DatasetSplitName.eval,
            config=simple_text_config,
            mod_options=ModuleOptions(
                model_contract_method_name=SupportedMethod.Inputs, pipeline_index=0
            ),
        ).get_threshold()
        == 0.7
    )
    assert (
        HFTextClassificationModule(
            DatasetSplitName.eval,
            config=simple_text_config,
            mod_options=ModuleOptions(
                threshold=0.9, model_contract_method_name=SupportedMethod.Inputs, pipeline_index=0
            ),
        ).get_threshold()
        == 0.9
    )


def test_callback(simple_text_config, dask_client):
    class MyModule(AggregationModule):
        def compute_on_dataset_split(self):
            time.sleep(1)
            return [3]

    def my_callback(fut, module, param):
        time.sleep(2)
        return fut.result()[0] + param

    mod = MyModule(DatasetSplitName.eval, simple_text_config)
    mod.start_task_on_dataset_split(dask_client)
    # on_end added automatically
    assert len(mod._callbacks) == 1
    assert not mod.done()
    mod.add_done_callback(my_callback, param=3)
    assert len(mod._callbacks) == 2
    assert not mod.done()

    while not mod.done():
        # Wait for everyone to finish
        time.sleep(1)
    assert all(m.done for m in mod._callbacks)

    # 3 + 3, much wow
    assert mod.result()[0] == 3
    assert mod._callbacks[-1].result == 6

    # Should be cached
    new_mod = MyModule(DatasetSplitName.eval, simple_text_config)
    assert new_mod.done() and len(new_mod._callbacks) == 0


class ModuleA(AggregationModule):
    def compute_on_dataset_split(self):
        # Awesome module that returns the result of a Variable.
        a = Variable("my-variable")
        val = a.get()
        return [val]


class ModuleB(AggregationModule):
    def compute_on_dataset_split(self):
        # Awesome module that waits 3 seconds before setting a Variable
        time.sleep(3)
        a = Variable("my-variable")
        a.set(123)
        return [123]


def test_dependencies(simple_text_config, dask_client):
    # Test that a module A can wait for a module B.
    a = Variable("my-variable")
    a.set(0)

    modA = ModuleA(DatasetSplitName.eval, simple_text_config)
    modB = ModuleB(DatasetSplitName.eval, simple_text_config)
    assert not any(m.done() for m in [modA, modB])

    modB.start_task_on_dataset_split(dask_client)
    modA.start_task_on_dataset_split(dask_client, [modB])
    # Wait and check that the modA is not done.
    time.sleep(1)
    assert not modA.done()

    # We now wait for the results of all modules.
    [resB] = modB.result()
    [resA] = modA.result()
    # We check that the values match, ie module A did not take the initial value (0).
    assert resA == resB
    # wait for events to be set
    time.sleep(2)
    assert modB.done_event.is_set()
    assert modA.done_event.is_set()


def test_dependencies_failing(simple_text_config, dask_client):
    # Test that we can't wait for a Module that is not started.
    a = Variable("my-variable")
    a.set(0)

    modA = ModuleA(DatasetSplitName.eval, simple_text_config)
    modB = ModuleB(DatasetSplitName.eval, simple_text_config)
    assert not any(m.done() for m in [modA, modB])

    with pytest.raises(ValueError) as excinfo:
        modA.start_task_on_dataset_split(dask_client, dependencies=[modB])
    assert "Can't wait for an unstarted Module" in str(excinfo.value)


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
        class_name="tests.test_modules.test_module.my_dataset_fn", kwargs={"valid": True}
    )
    mod = IndexableModule(
        DatasetSplitName.eval, config=simple_text_config, mod_options=ModuleOptions(indices=[0, 1])
    )
    ds = mod.get_dataset_split()
    assert ds["utterance"] == ["d", "e"]

    # Otherwise, we take validation
    simple_text_config.dataset = CustomObject(
        class_name="tests.test_modules.test_module.my_dataset_fn", kwargs={"valid": False}
    )
    mod.clear_cache()
    mod = Module(DatasetSplitName.eval, config=simple_text_config)
    ds = mod.get_dataset_split()
    assert ds["utterance"] == ["h", "i", "j"]


if __name__ == "__main__":
    pytest.main()
