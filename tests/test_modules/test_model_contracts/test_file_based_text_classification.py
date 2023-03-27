# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import List, cast

import numpy as np
import pytest

from azimuth.modules.model_contracts import FileBasedTextClassificationModule
from azimuth.types import DatasetSplitName, ModuleOptions, SupportedMethod
from azimuth.types.task import PredictionResponse


def test_loading_dataset(file_text_config_top3):
    eval_task = FileBasedTextClassificationModule(
        DatasetSplitName.eval,
        file_text_config_top3,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Predictions, pipeline_index=0
        ),
    )

    assert eval_task.get_model() is not None and callable(eval_task.get_model())

    ds = eval_task.get_dataset_split()
    assert ds is not None
    # We know our eval predictions file has only 4 entries
    assert len(ds) == 4

    train_task = FileBasedTextClassificationModule(
        DatasetSplitName.train,
        file_text_config_top3,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Predictions, pipeline_index=0
        ),
    )

    # Make sure the training set is read as usual
    assert len(train_task.get_dataset_split()) == 8


def test_predictions_top3(file_text_config_top3):
    task = FileBasedTextClassificationModule(
        DatasetSplitName.eval,
        file_text_config_top3,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Predictions, pipeline_index=0
        ),
    )

    result = cast(List[PredictionResponse], task.compute_on_dataset_split())

    assert len(result) == 4

    for prediction_entry in result:
        # The model used in the fixture predictions file got it all correct
        assert prediction_entry.label == prediction_entry.postprocessed_output.preds[0]

    # Make sure we are predicting in the expected order, as defined in the fixture
    assert np.isclose(np.max(result[0].postprocessed_output.probs[0]), 0.999999881)
    assert np.isclose(np.max(result[1].postprocessed_output.probs[0]), 0.811522245)
    assert np.isclose(np.max(result[2].postprocessed_output.probs[0]), 0.986969113)
    assert np.isclose(np.max(result[3].postprocessed_output.probs[0]), 0.9999999913300003)

    # First 2 examples are no intent and last is class 3
    assert result[0].label == result[1].label == 2
    assert result[2].label == 3

    assert result[0].postprocessed_output.preds[0] == 2
    assert result[1].postprocessed_output.preds[0] == 2
    assert result[2].postprocessed_output.preds[0] == 3

    # Example where the sum of softmax outputs > 1
    assert np.isfinite(result[3].entropy)


def test_saliency_top3(file_text_config_top3):
    with pytest.raises(NotImplementedError):
        task = FileBasedTextClassificationModule(
            DatasetSplitName.eval,
            file_text_config_top3,
            mod_options=ModuleOptions(
                model_contract_method_name=SupportedMethod.Saliency, pipeline_index=0
            ),
        )

        task.compute_on_dataset_split()


def test_predictions_top1(file_text_config_top1):
    task = FileBasedTextClassificationModule(
        DatasetSplitName.eval,
        file_text_config_top1,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Predictions, pipeline_index=0
        ),
    )

    ds = task.get_dataset_split()
    assert ds is not None
    # We know our top-1 predictions file has 6 entries
    assert len(ds) == 6

    result = cast(List[PredictionResponse], task.compute_on_dataset_split())
    assert len(result) == 6

    for prediction_entry in result:
        # sum of softmax outputs <= 1
        assert np.isfinite(prediction_entry.entropy)

    # Make sure we are predicting in the expected order, as defined in the fixture
    assert np.isclose(np.max(result[0].postprocessed_output.probs[0]), 0.987)
    assert np.isclose(np.max(result[1].postprocessed_output.probs[0]), 0.811)
    assert np.isclose(np.max(result[2].postprocessed_output.probs[0]), 0.986)

    # First 2 examples are no intent and last is class 3
    assert result[0].label == result[1].label == 2
    assert result[2].label == 3

    assert result[0].postprocessed_output.preds[0] == 2
    assert result[1].postprocessed_output.preds[0] == 2
    assert result[2].postprocessed_output.preds[0] == 3


def test_dataset_with_nointent(file_text_config_no_intent):
    task = FileBasedTextClassificationModule(
        DatasetSplitName.train,
        file_text_config_no_intent,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Predictions, pipeline_index=0
        ),
    )

    ds = task.get_dataset_split()

    # In this case, eval there is a no intent class and that it was not added at the end
    class_names = ds.features["label"].names
    assert "NO_INTENT" in class_names
    assert class_names.index("NO_INTENT") != (len(class_names) - 1)

    assert len(class_names) == 5

    ds_eval = task.get_dataset_split(DatasetSplitName.eval)
    assert ds_eval is not None
    # We know our top-1 predictions evaluation file has 5 entries
    assert len(ds_eval) == 6


def test_empty_no_intent(file_text_config_top1):
    task = FileBasedTextClassificationModule(
        DatasetSplitName.eval,
        file_text_config_top1,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Predictions, pipeline_index=0
        ),
    )

    ds = task.get_dataset_split()
    assert ds is not None
    # We know our top-1 predictions file has 6 entries, and 2 as NO_INTENT
    assert len(ds) == 6

    ds_train = task.get_dataset_split(DatasetSplitName.train)
    class_names = ds_train.features["label"].names

    # Ensure we read empty string as NO_INTENT
    assert ds[3]["label"] == class_names.index("NO_INTENT")
    assert ds[4]["label"] == class_names.index("NO_INTENT")

    result = cast(List[PredictionResponse], task.compute_on_dataset_split())
    # Ensure we read empty string as NO_INTENT in the predictions
    assert result[3].postprocessed_output.preds[0] != class_names.index("NO_INTENT")
    assert result[4].postprocessed_output.preds[0] == class_names.index("NO_INTENT")

    # If we read NO_INTENT as prediction, then we put all the mass there
    assert np.max(result[4].postprocessed_output.probs[0]) == 1.0
