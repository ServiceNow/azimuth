import pytest
from fastapi import HTTPException

from azimuth import app
from azimuth.app import get_all_dataset_split_managers, get_dataset_split_manager
from azimuth.types.general.dataset import DatasetSplitName

eval_split = "eval_split"
train_split = "train_split"
mock_dataset_split_mapping_with_only_eval = {DatasetSplitName.eval: eval_split}
mock_dataset_split_mapping_with_both = {
    DatasetSplitName.eval: eval_split,
    DatasetSplitName.train: train_split,
}


def test_get_dataset_split_manager(monkeypatch):

    monkeypatch.setattr(
        app, "_dataset_split_managers", mock_dataset_split_mapping_with_only_eval, raising=True
    )
    with pytest.raises(HTTPException) as excinfo:
        get_dataset_split_manager(DatasetSplitName.train)
    assert excinfo.value.status_code == 404

    r = get_dataset_split_manager(DatasetSplitName.eval)

    assert r == eval_split


def test_get_all_dataset_split_managers_with_both_dataset_splits(monkeypatch):
    monkeypatch.setattr(
        app, "_dataset_split_managers", mock_dataset_split_mapping_with_both, raising=True
    )
    r = get_all_dataset_split_managers()

    assert r == mock_dataset_split_mapping_with_both


def test_get_all_dataset_split_managers_with_only_eval_split(monkeypatch):
    monkeypatch.setattr(
        app, "_dataset_split_managers", mock_dataset_split_mapping_with_only_eval, raising=True
    )
    with pytest.raises(HTTPException) as excinfo:
        get_all_dataset_split_managers()
    assert excinfo.value.status_code == 404
