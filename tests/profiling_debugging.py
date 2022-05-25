"""
This file help profiling Module. Change the constants and run the file.
"""
import tempfile

from pyinstrument import Profiler
from tqdm import tqdm

from azimuth.config import AzimuthConfig
from azimuth.modules.base_classes import DatasetResultModule
from azimuth.modules.model_performance.metrics import MetricsPerFilterModule
from azimuth.task_manager import TaskManager
from azimuth.types import (
    DatasetSplitName,
    ModuleOptions,
    SupportedMethod,
    SupportedModule,
)
from azimuth.utils.project import load_dataset_split_managers_from_config

CFG_FILE = "../local_configs/development/clinc/conf.json"
MODULE = MetricsPerFilterModule
DATASET_SPLIT = DatasetSplitName.eval

DEPENDENCIES = [SupportedMethod.Predictions, SupportedModule.Outcome]
DEPS_MOD_OPTIONS = ModuleOptions(pipeline_index=0)
MOD_OPTIONS = ModuleOptions(pipeline_index=0)


def main():
    config = AzimuthConfig.parse_file(CFG_FILE).copy(
        update={"artifact_path": str(tempfile.mkdtemp())}
    )
    _ = load_dataset_split_managers_from_config(config)
    task_manager = TaskManager(config)
    for dep in tqdm(DEPENDENCIES, desc="Running dependencies..."):
        _, mod = task_manager.get_task(
            dep, dataset_split_name=DATASET_SPLIT, mod_options=DEPS_MOD_OPTIONS
        )
        if isinstance(mod, DatasetResultModule):
            mod.save_result(mod.result(), mod.get_dataset_split_manager())

    print("Starting profiler!")
    with Profiler() as p:
        mod = MODULE(dataset_split_name=DATASET_SPLIT, config=config, mod_options=MOD_OPTIONS)
        mod.compute_on_dataset_split()

    p.print()


if __name__ == "__main__":
    main()
