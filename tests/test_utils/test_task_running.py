from unittest.mock import MagicMock

import pytest

from azimuth.types import (
    DatasetFilters,
    DatasetSplitName,
    ModuleOptions,
    SupportedModule,
)
from azimuth.utils.routers import get_custom_task_result, get_standard_task_result

standard_task_result = "task_result"
custom_task_result = "custom_task_result"
task_name = SupportedModule.PerturbationTestingSummary
dataset_split_name = DatasetSplitName.train
indices = [1, 2, 3]
mod_options = ModuleOptions(
    threshold=0.6, filters=DatasetFilters(label=[0]), pipeline_index=0
)  # example
custom_query = {"custom_key1": 1, "custom_key2": "two"}

last_update = 11


@pytest.fixture
def mock_task_result():
    fake_task_response = MagicMock()
    fake_task_response.result = MagicMock(return_value=standard_task_result)

    fake_custom_task_response = MagicMock()
    fake_custom_task_response.result = MagicMock(return_value=custom_task_result)

    fake_task_manager = MagicMock()
    fake_task_manager.get_task = MagicMock(return_value=("DISCARD", fake_task_response))
    fake_task_manager.get_custom_task = MagicMock(
        return_value=("DISCARD", fake_custom_task_response)
    )

    return fake_task_manager


def test_run_standard_task(mock_task_result):
    result = get_standard_task_result(
        task_name, dataset_split_name, mock_task_result, mod_options, last_update
    )

    mock_task_result.get_task.assert_called_with(
        task_name=task_name,
        dataset_split_name=dataset_split_name,
        mod_options=mod_options,
        last_update=last_update,
    )

    assert result == standard_task_result


def test_run_custom_task(mock_task_result):
    result = get_custom_task_result(task_name, mock_task_result, custom_query, mod_options)

    mock_task_result.get_custom_task.assert_called_with(
        task_name=task_name,
        custom_query=custom_query,
        mod_options=mod_options,
    )

    assert result == custom_task_result
