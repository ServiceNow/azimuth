# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from azimuth.modules.model_contracts import CustomTextClassificationModule
from azimuth.types import DatasetSplitName, ModuleOptions, SupportedMethod


def test_loading_model(guse_text_config):
    task = CustomTextClassificationModule(
        DatasetSplitName.eval,
        guse_text_config,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Predictions, pipeline_index=0
        ),
    )

    # Test that we get the model
    assert task.get_model() is not None
    # The model in this case consists of a callable
    assert callable(task.get_model())


def test_prediction(guse_text_config):
    task = CustomTextClassificationModule(
        DatasetSplitName.eval,
        guse_text_config,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Predictions,
            pipeline_index=0,
            indices=[0, 1, 2],
        ),
    )

    assert task is not None

    result = task.compute_on_dataset_split()
    # We just test that the prediction is not broken as we are using a dummy model
    assert len(result) == len(task.get_indices())


def test_saliency(guse_text_config):
    task = CustomTextClassificationModule(
        DatasetSplitName.eval,
        guse_text_config,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Saliency, pipeline_index=0, indices=[0, 1, 2]
        ),
    )

    assert task is not None

    json_output = task.compute_on_dataset_split()

    # Simply test saliency is not broken
    assert len(json_output) == len(task.get_indices())
