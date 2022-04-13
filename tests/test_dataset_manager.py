# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import os
from glob import glob
from os.path import join as pjoin

import numpy as np
import pandas as pd
import pytest
from datasets import ClassLabel, Dataset, Features, Value

from azimuth.config import AzimuthValidationError
from azimuth.dataset_split_manager import DatasetSplitManager, PredictionTableKey
from azimuth.types.general.dataset import DatasetColumn, DatasetSplitName
from azimuth.types.tag import ALL_STANDARD_TAGS, ALL_TAGS


def test_dataset_manager_tags(a_text_dataset, simple_text_config, simple_table_key):
    tags = ["red", "blue", "orange"]
    ds_mng = DatasetSplitManager(
        DatasetSplitName.eval,
        config=simple_text_config,
        initial_tags=tags,
        dataset_split=a_text_dataset,
    )
    assert os.path.exists(ds_mng._save_path)
    assert all(t in ds_mng.get_dataset_split(simple_table_key).column_names for t in tags)
    assert (np.array(ds_mng.get_dataset_split(simple_table_key)["red"]) == False).all()  # noqa

    # We can tags stuff!
    tags_data = {1: {"red": True}, 2: {"red": True, "blue": True}}
    ds_mng.add_tags(tags_data, simple_table_key)
    assert np.array(ds_mng.get_dataset_split(simple_table_key)["red"]).sum() == 2
    assert np.array(ds_mng.get_dataset_split(simple_table_key)["blue"]).sum() == 1

    # We can reload a dataset!
    ds_mng2 = DatasetSplitManager(
        DatasetSplitName.eval,
        config=simple_text_config,
        initial_tags=tags,
        dataset_split=a_text_dataset,
    )
    assert np.array(ds_mng2.get_dataset_split(simple_table_key)["red"]).sum() == 2
    assert np.array(ds_mng2.get_dataset_split(simple_table_key)["blue"]).sum() == 1

    # We can't tag garbage
    tags_data = {4: {"red": True}, 5: {"red": True, "garbage": True}}
    with pytest.raises(ValueError):
        ds_mng.add_tags(tags_data)
    assert "garbage" not in ds_mng.get_dataset_split(simple_table_key).column_names

    # We can query all tags
    tags_data = ds_mng.get_tags(table_key=None)
    assert len(tags_data) == len(ds_mng2.get_dataset_split(simple_table_key))
    assert len(tags_data[0]) == len(tags)

    # We can query some tags
    tags_data = ds_mng.get_tags(indices=[1, 2], table_key=None)
    assert len(tags_data) == 2
    assert len(tags_data[0]) == len(tags)


def test_dataset_manager_init(a_text_dataset, simple_text_config):
    tags = ["red", "blue", "orange"]
    with pytest.raises(ValueError):
        _ = DatasetSplitManager(
            DatasetSplitName.eval, config=simple_text_config, initial_tags=tags, dataset_split=None
        )

    with pytest.raises(AzimuthValidationError, match="potato"):
        cfg = simple_text_config.copy(update={"columns": {"text_input": "potato"}}, deep=True)
        _ = DatasetSplitManager(
            DatasetSplitName.eval, config=cfg, initial_tags=tags, dataset_split=a_text_dataset
        )

    with pytest.raises(AzimuthValidationError, match="potato"):
        cfg = simple_text_config.copy(update={"columns": {"label": "potato"}}, deep=True)
        _ = DatasetSplitManager(
            DatasetSplitName.eval, config=cfg, initial_tags=tags, dataset_split=a_text_dataset
        )


def test_class_distribution(a_text_dataset, simple_text_config):
    num_classes = len(a_text_dataset.features["label"].names)
    tags = ["red", "blue", "orange"]
    ds_mng = DatasetSplitManager(
        DatasetSplitName.eval,
        config=simple_text_config,
        initial_tags=tags,
        dataset_split=a_text_dataset,
    )

    class_distribution = ds_mng.class_distribution()
    assert len(class_distribution) == num_classes
    assert sum(class_distribution) == len(a_text_dataset)
    assert len(ds_mng.class_names) == num_classes


def test_to_csv(text_dm_with_tags, simple_table_key):
    text_dm_with_tags.config.name = "newName"
    pt = text_dm_with_tags.save_csv(simple_table_key)
    assert os.path.exists(pt)

    name = os.path.basename(pt)
    assert name.count("_") == 5  # azimuth_export_{name}_{dataset_split}_{date}_{time}.csv
    splitted = name.split("_")
    assert splitted[2] == "newName" and splitted[3] == "eval"

    df = pd.read_csv(pt)
    assert all(t in df.columns for t in ALL_TAGS)

    index = {c: i for i, c in enumerate(df.columns)}
    assert (
        index[DatasetColumn.row_idx]
        < index[DatasetColumn.idx]
        < index["utterance"]
        < index["label"]
        < index[DatasetColumn.model_predictions]
        < index[DatasetColumn.postprocessed_prediction]
        < index[DatasetColumn.model_confidences]
        < index[DatasetColumn.postprocessed_confidences]
        < index[DatasetColumn.confidence_bin_idx]
        < index[DatasetColumn.outcome]
        < index[ALL_TAGS[0]]
    ), df.columns.tolist()

    assert df["label"][0] in text_dm_with_tags.class_names
    assert (
        df[DatasetColumn.postprocessed_prediction][
            text_dm_with_tags._base_dataset_split[DatasetColumn.postprocessed_prediction].index(-1)
        ]
        == "REJECTION_CLASS"
    )


def test_to_csv_no_model(text_dm_with_tags):
    text_dm_with_tags.config.name = "newName"
    pt = text_dm_with_tags.save_csv(table_key=None)
    assert os.path.exists(pt)

    name = os.path.basename(pt)
    assert name.count("_") == 5  # azimuth_export_{name}_{dataset_split}_{date}_{time}.csv
    splitted = name.split("_")
    assert splitted[2] == "newName" and splitted[3] == "eval"

    df = pd.read_csv(pt)
    assert all(t in df.columns for t in ALL_STANDARD_TAGS)

    index = {c: i for i, c in enumerate(df.columns)}
    assert (
        index[DatasetColumn.row_idx]
        < index[DatasetColumn.idx]
        < index["utterance"]
        < index["label"]
        < index[ALL_TAGS[0]]
    ), df.columns.tolist()

    assert df["label"][0] in text_dm_with_tags.class_names


@pytest.mark.parametrize("column_name", ["failed_parsing", "malformed"])
def test_malformed(simple_text_config, column_name):
    simple_text_config.columns.failed_parsing_reason = column_name
    dataset = Dataset.from_dict(
        {
            simple_text_config.columns.text_input: ["hello", "a*6fd", "potato", "09%198", "rock"],
            simple_text_config.columns.label: [1, 1, 0, 0, 0],
            simple_text_config.columns.failed_parsing_reason: [
                "",
                "not a word",
                "",
                "not a word",
                "",
            ],
        },
        features=Features(
            **{
                simple_text_config.columns.text_input: Value("string"),
                simple_text_config.columns.failed_parsing_reason: Value("string"),
                simple_text_config.columns.label: ClassLabel(num_classes=2),
            }
        ),
    )
    dm = DatasetSplitManager(
        name=DatasetSplitName.eval,
        config=simple_text_config,
        initial_tags=[],
        dataset_split=dataset,
    )
    assert len(dm._base_dataset_split) == 3
    assert len(dm._malformed_dataset) == 2

    # Both dataset are saved!
    dm2 = DatasetSplitManager(
        name=DatasetSplitName.eval, config=simple_text_config, initial_tags=[], dataset_split=None
    )
    # NOTE: Can't compare fingerprint as the column are sorted when we load the dataset.
    assert dm._base_dataset_split.shape == dm2._base_dataset_split.shape
    assert dm._malformed_dataset.shape == dm2._malformed_dataset.shape
    assert len(dm2._base_dataset_split) == 3
    assert len(dm2._malformed_dataset) == 2


def test_multi_tables(a_text_dataset, simple_text_config, simple_table_key):
    dm = DatasetSplitManager(
        name="potato",
        config=simple_text_config,
        initial_tags=["a", "b", "c"],
        dataset_split=a_text_dataset,
    )
    ds = dm.get_dataset_split(simple_table_key)
    assert len(ds) == dm.num_rows
    assert DatasetColumn.row_idx in ds.column_names

    # Add a column to a non-existent table
    dm.add_column_to_prediction_table(
        "prediction",
        np.random.randn(len(ds), 10).tolist(),
        PredictionTableKey(
            threshold=0.1,
            temperature=21,
            use_bma=False,
            pipeline_index=0,
            pipeline_config_hash="potato",
        ),
    )
    # Check that the table exists
    assert (
        PredictionTableKey(0.1, 21, False, pipeline_index=0, pipeline_config_hash="potato")
        in dm._prediction_tables
        and "prediction"
        in dm._prediction_tables[
            PredictionTableKey(0.1, 21, False, pipeline_index=0, pipeline_config_hash="potato")
        ].column_names
    )

    dm.add_column_to_prediction_table(
        "prediction2",
        np.random.randn(len(ds), 10).tolist(),
        simple_table_key,
    )
    ds = dm.get_dataset_split(simple_table_key)
    # Check that this is a new dataset.
    assert "prediction2" in ds.column_names
    assert "prediction" not in ds.column_names
    # Check that the new column was not added to the previous dataset.
    ds = dm.dataset_split_with_predictions(
        PredictionTableKey(0.1, 21, False, 0, pipeline_config_hash="potato")
    )
    assert "prediction" in ds.column_names
    assert "prediction2" not in ds.column_names

    # Can add a column normally
    dm.add_column("is_potato", [True] * len(ds))
    assert "is_potato" in dm._base_dataset_split.column_names
    assert "is_potato" in dm.get_dataset_split(simple_table_key).column_names

    # Check that there are 2 tables created.
    assert "HF_datasets" in os.listdir(dm._artifact_path)
    assert len(os.listdir(os.path.join(dm._hf_path, "prediction_tables"))) == 2

    with pytest.raises(ValueError, match="Length mismatch"):
        dm.add_column("is_potato2", [True] * (len(ds) - 1))

    with pytest.raises(ValueError, match="Length mismatch"):
        dm.add_column("is_potato2", [True] * (len(ds) + 1))

    with pytest.raises(ValueError, match="Length mismatch"):
        dm.add_column("is_potato2", [])


def test_caching(a_text_dataset, simple_text_config, simple_table_key):
    dm1 = DatasetSplitManager(
        DatasetSplitName.eval,
        config=simple_text_config,
        initial_tags=["red", "blue", "orange"],
        initial_prediction_tags=["potato"],
        dataset_split=a_text_dataset,
    )
    pred_path = dm1._prediction_path(simple_table_key)

    assert len(glob(pjoin(pred_path, "version_*.arrow"))) == 0, "Some preds were cached at init?"
    assert len(glob(pjoin(dm1._save_path, "version_*.arrow"))) == 1, "Dataset not saved on disk"

    dm1.add_column("pink", list(range(len(a_text_dataset))))
    assert (
        len(glob(pjoin(pred_path, "version_*.arrow"))) == 0
    ), "Some preds were cached when adding a column on the base."
    assert (
        len(glob(pjoin(dm1._save_path, "version_*.arrow"))) == 2
    ), "Dataset not saved on disk when added a column"

    dm1.add_column_to_prediction_table(
        "apple", list(range(len(a_text_dataset))), table_key=simple_table_key
    )
    # NOTE: We create 2 version, because we initialize a first one before adding the column.
    assert (
        len(glob(pjoin(pred_path, "version_*.arrow"))) == 2
    ), "Preds were not cached when adding a column."
    assert (
        len(glob(pjoin(dm1._save_path, "version_*.arrow"))) == 2
    ), "New version of based dataset detected when adding prediction"

    dm2 = DatasetSplitManager(
        DatasetSplitName.eval,
        config=simple_text_config,
        initial_tags=["red", "blue", "orange"],
        initial_prediction_tags=["potato"],
    )
    assert not any(
        {"apple", "pink"}.difference(dm2.get_dataset_split(simple_table_key).column_names)
    ), "Not latest version loaded."


def test_rejection_class_check(simple_text_config, a_text_dataset):
    simple_text_config.rejection_class = None
    dm = DatasetSplitManager(
        DatasetSplitName.eval,
        config=simple_text_config,
        initial_tags=[],
        dataset_split=a_text_dataset,
    )
    assert dm.rejection_class_idx == -1
    simple_text_config.rejection_class = "negative"
    dm = DatasetSplitManager(
        DatasetSplitName.eval,
        config=simple_text_config,
        initial_tags=[],
        dataset_split=a_text_dataset,
    )
    assert dm.rejection_class_idx == 0  # First class

    simple_text_config.rejection_class = "Potatoes"
    with pytest.raises(AzimuthValidationError):
        dm = DatasetSplitManager(
            DatasetSplitName.eval,
            config=simple_text_config,
            initial_tags=[],
            dataset_split=a_text_dataset,
        )
