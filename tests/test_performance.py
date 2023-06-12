import time

from azimuth.modules.model_contracts import HFTextClassificationModule
from azimuth.types import DatasetFilters, DatasetSplitName, ModuleOptions, SupportedMethod
from azimuth.utils.dataset_operations import filter_dataset_split


def test_dataset_processing_speed(simple_text_config):
    mod = HFTextClassificationModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Predictions, pipeline_index=0
        ),
    )
    mod.compute_on_dataset_split()

    # Loading the ds
    start = time.perf_counter()
    ds = mod.get_dataset_split()
    stop = time.perf_counter()
    assert (stop - start) <= 0.02

    # Filtering on the prediction
    start = time.perf_counter()
    filter_dataset_split(
        ds,
        DatasetFilters(prediction=[0]),
        config=simple_text_config,
    )
    stop = time.perf_counter()
    assert (stop - start) <= 0.0003
