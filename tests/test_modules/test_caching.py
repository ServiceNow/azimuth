# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import json
from copy import deepcopy

import h5py
import pytest

from azimuth.config import PerturbationTestingConfig
from azimuth.modules.base_classes import (
    AggregationModule,
    FilterableModule,
    IndexableModule,
    Module,
)
from azimuth.modules.base_classes.caching import HDF5FileOpenerWithRetry
from azimuth.types import (
    DatasetFilters,
    DatasetSplitName,
    ModuleOptions,
    ModuleResponse,
)


@pytest.mark.parametrize(
    "data, indices",
    [
        ([{"a": 1}], [1]),  # Simple
        ([{"a": 1}, {"a": 2}], [1, 5]),  # Multiple indices
        ([{"a": {"b": 32}}], [1]),  # Complex structure
        ([{"a": [1, 4, 6]}], [1]),  # Complex structure
        ([{"a": [1, 4, 6]}, {"a": [1, 4, 5]}], [1, 7]),  # Multi indices, complex
    ],
)
def test_hdf5_caching(data, indices, simple_text_config):
    mod = IndexableModule(
        DatasetSplitName.eval, simple_text_config, mod_options=ModuleOptions(indices=indices)
    )

    assert not mod._check_cache(indices)
    # File doesn't exist
    with pytest.raises(OSError):
        mod._get_cache(indices)

    mod._store_data_in_cache(data, indices)
    assert mod._check_cache(indices)
    data_retrieved = mod._get_cache(indices)

    # Cache doesn't exist
    with pytest.raises(KeyError):
        mod._get_cache([43, 35, 56])

    # Should be jsonable in any case.
    assert json.dumps(data) == json.dumps(data_retrieved)

    # Verify that if changing the threshold, the module name will be different, which implies a
    # new cache.
    modified_th_config = deepcopy(simple_text_config)
    # We modify the threshold at both places to be consistent,
    # but in practice only the `kwargs` is used.
    modified_th_config.pipelines[0].postprocessors[-1].kwargs["threshold"] = 0.8
    modified_th_config.pipelines[0].postprocessors[-1].threshold = 0.8
    modified_th_mod = IndexableModule(
        DatasetSplitName.eval, modified_th_config, mod_options=ModuleOptions(indices=indices)
    )
    assert mod.name != modified_th_mod.name


def test_module_cache_with_options(simple_text_config):
    # Testing FilterableModule which should be affected by changing the filters
    original_mod = FilterableModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(filters=DatasetFilters(label=[0]), pipeline_index=0),
    )

    modified_mod = FilterableModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(filters=DatasetFilters(label=[1]), pipeline_index=0),
    )

    assert original_mod.name != modified_mod.name

    # Testing regular modules cannot be affected by filters.
    with pytest.raises(ValueError):
        Module(
            DatasetSplitName.eval,
            simple_text_config,
            mod_options=ModuleOptions(filters=DatasetFilters(label=[0]), pipeline_index=0),
        )


class MyFileThatIsOpened:
    n = 0

    def __init__(self, *args, **kwargs):
        self.open = False
        if MyFileThatIsOpened.n < 5:
            MyFileThatIsOpened.n += 1
            raise OSError("Can't open")
        self.open = True

    def close(self):
        self.open = False


def test_hdf5_retry_success(monkeypatch):
    MyFileThatIsOpened.n = 0
    monkeypatch.setattr(h5py, "File", MyFileThatIsOpened)
    with HDF5FileOpenerWithRetry("my_file", n_retry=6) as f:
        assert isinstance(f, MyFileThatIsOpened)
        assert f.open
    assert not f.open


def test_hdf5_retry_fail(monkeypatch):
    MyFileThatIsOpened.n = 0
    monkeypatch.setattr(h5py, "File", MyFileThatIsOpened)
    with pytest.raises(TimeoutError, match="Can't open"):
        with HDF5FileOpenerWithRetry("my_file", n_retry=1) as _:
            pass


class Potato(ModuleResponse):
    a: int
    b: float


def test_wrong_aggregation_module(simple_text_config):
    class MyAggregationModule(AggregationModule):
        pass

    with pytest.raises(ValueError):
        MyAggregationModule(
            dataset_split_name=DatasetSplitName.eval,
            config=simple_text_config,
            mod_options=ModuleOptions(indices=[1, 2, 3]),
        )


class MyPerturbationModule(Module[PerturbationTestingConfig]):
    def compute_on_dataset_split(self):
        return [{"potato": i} for i in self.get_indices()]


def test_scoped_caching_different(simple_text_config, dask_client):
    my_perturbation_module = MyPerturbationModule(
        DatasetSplitName.eval,
        config=simple_text_config,
    )
    assert not my_perturbation_module.done()
    res = my_perturbation_module.compute_on_dataset_split()
    my_perturbation_module._store_data_in_cache(res, my_perturbation_module.get_indices())

    new_config = simple_text_config.copy(update={"similarity": None})
    new_perturbation_module = MyPerturbationModule(DatasetSplitName.eval, config=new_config)
    assert new_perturbation_module.name == my_perturbation_module.name
    assert new_perturbation_module.done()


def test_scoped_caching_inner(simple_text_config, dask_client):
    my_perturbation_module = MyPerturbationModule(DatasetSplitName.eval, config=simple_text_config)
    assert not my_perturbation_module.done()
    res = my_perturbation_module.compute_on_dataset_split()
    my_perturbation_module._store_data_in_cache(res, my_perturbation_module.get_indices())

    new_config = simple_text_config.copy(update={"saliency_layer": "potato"})
    new_perturbation_module = MyPerturbationModule(DatasetSplitName.eval, config=new_config)
    assert new_perturbation_module.name != my_perturbation_module.name
    assert not new_perturbation_module.done()


def test_scoped_caching_common(simple_text_config, dask_client):
    my_perturbation_module = MyPerturbationModule(DatasetSplitName.eval, config=simple_text_config)
    assert not my_perturbation_module.done()
    res = my_perturbation_module.compute_on_dataset_split()
    my_perturbation_module._store_data_in_cache(res, my_perturbation_module.get_indices())

    new_config = simple_text_config.copy(update={"batch_size": 32})
    new_perturbation_module = MyPerturbationModule(DatasetSplitName.eval, config=new_config)
    assert new_perturbation_module.name == my_perturbation_module.name
    assert new_perturbation_module.done()


if __name__ == "__main__":
    pytest.main()
