from typing import List

from distributed import get_client

from azimuth.modules.base_classes import IndexableModule
from azimuth.modules.task_execution import get_task_result
from azimuth.types import DatasetSplitName, ModuleOptions, ModuleResponse


class Potato(ModuleResponse):
    a: int


class MyModule(IndexableModule):
    def compute_on_dataset_split(self) -> List[ModuleResponse]:
        return [Potato(a=a) for a in self.get_indices()]


def test_get_task_result(dask_client, simple_text_config):
    mod1 = MyModule(
        dataset_split_name=DatasetSplitName.eval,
        config=simple_text_config,
        mod_options=ModuleOptions(indices=[1, 2, 3]),
    )
    res = get_task_result(mod1, List[Potato])
    assert len(res) == 3
    mod1.wait()
    assert mod1._check_cache(mod1.get_caching_indices())


def test_get_task_result_no_client(simple_text_config):
    # We can also do that without a task client
    try:
        client = get_client()
        client.close()
    except Exception:
        # Client already closed
        pass

    mod2 = MyModule(
        dataset_split_name=DatasetSplitName.eval,
        config=simple_text_config,
        mod_options=ModuleOptions(indices=[4, 5, 6, 7]),
    )
    res2 = get_task_result(mod2, List[Potato])
    assert len(res2) == 4
    mod2.wait()
    assert mod2._check_cache(mod2.get_caching_indices())
