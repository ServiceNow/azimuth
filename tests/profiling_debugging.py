"""
This file help profiling Module. Change the constants and run the file.
"""
import tempfile
import threading
import time

import psutil
from pyinstrument import Profiler
from tqdm import tqdm

from azimuth.app import load_dataset_split_managers_from_config
from azimuth.config import AzimuthConfig
from azimuth.modules.base_classes import DatasetResultModule
from azimuth.modules.model_performance.metrics import MetricsPerFilterModule
from azimuth.task_manager import TaskManager
from azimuth.types import DatasetSplitName, ModuleOptions, SupportedMethod, SupportedModule

CFG_FILE = "../local_configs/development/clinc/conf.json"
MODULE = MetricsPerFilterModule
DATASET_SPLIT = DatasetSplitName.eval

DEPENDENCIES = [SupportedMethod.Predictions, SupportedModule.Outcome]
DEPS_MOD_OPTIONS = ModuleOptions(pipeline_index=0)
MOD_OPTIONS = ModuleOptions(pipeline_index=0)


def print_memory():
    def fn():
        while True:
            print(f"Memory used: {psutil.virtual_memory().used / 1024 / 1024}")
            time.sleep(2)

    threading.Thread(target=fn).start()


def main():
    print_memory()
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
        res = mod.compute_on_dataset_split()

    file_name = "logs.txt"
    with open(file_name, "w") as f:
        p.print(file=f)

    print(res)


if __name__ == "__main__":
    main()
