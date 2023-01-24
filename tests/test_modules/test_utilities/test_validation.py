import pytest

from azimuth.config import CustomObject
from azimuth.modules.utilities.validation import ValidationModule
from azimuth.types import DatasetSplitName, ModuleOptions
from azimuth.utils.logs import MultipleExceptions


class ExceptionRaiserOnInit:
    def __init__(self):
        raise ValueError("Can't load!")


class ExceptionRaiserOnCall:
    def __call__(self, batch):
        raise ValueError("Can't call!")


def test_validation_module_happy_path_text_classif(simple_text_config):
    validation = ValidationModule(
        dataset_split_name=DatasetSplitName.eval,
        config=simple_text_config,
        mod_options=ModuleOptions(pipeline_index=0),
    )
    [result] = validation.compute_on_dataset_split()
    assert result.can_load_model
    assert result.can_load_dataset
    assert result.model_has_correct_type
    assert result.can_make_prediction
    assert result.can_make_saliency


def test_validation_module_happy_path_custom_text_classification(guse_text_config):
    validation = ValidationModule(
        dataset_split_name=DatasetSplitName.eval,
        config=guse_text_config,
        mod_options=ModuleOptions(pipeline_index=0),
    )
    [result] = validation.compute_on_dataset_split()
    assert result.can_load_model
    assert result.can_load_dataset
    assert result.model_has_correct_type
    assert result.can_make_prediction
    assert not result.can_make_saliency


def test_validation_module_cant_load_model(simple_text_config):
    simple_text_config.pipelines[0].model = CustomObject(
        class_name="tests.test_modules.test_utilities." "test_validation.ExceptionRaiserOnInit"
    )
    validation = ValidationModule(
        dataset_split_name=DatasetSplitName.eval,
        config=simple_text_config,
        mod_options=ModuleOptions(pipeline_index=0),
    )
    with pytest.raises(MultipleExceptions) as match:
        validation.compute_on_dataset_split()
    assert len(match.value.exceptions) == 1 and "Can't load!" in str(match.value.exceptions[0])


def test_validation_module_cant_load_dataset(simple_text_config):
    simple_text_config.dataset = CustomObject(
        class_name="tests.test_modules.test_utilities." "test_validation.ExceptionRaiserOnInit"
    )
    validation = ValidationModule(
        dataset_split_name=DatasetSplitName.eval,
        config=simple_text_config,
        mod_options=ModuleOptions(pipeline_index=0),
    )
    with pytest.raises(MultipleExceptions) as match:
        validation.compute_on_dataset_split()
    assert len(match.value.exceptions) == 1 and "Can't load!" in str(match.value.exceptions[0])


def test_validation_module_cant_predict_utterance_embedding(guse_text_config):
    guse_text_config.pipelines[0].model = CustomObject(
        class_name="tests.test_modules.test_utilities." "test_validation.ExceptionRaiserOnCall"
    )
    validation = ValidationModule(
        dataset_split_name=DatasetSplitName.eval,
        config=guse_text_config,
        mod_options=ModuleOptions(pipeline_index=0),
    )
    with pytest.raises(MultipleExceptions) as match:
        validation.compute_on_dataset_split()
    assert len(match.value.exceptions) == 1 and "Can't call!" in str(
        match.value.exceptions[0]
    ), match.value.exceptions


def test_validation_module_no_model(simple_text_config):
    simple_text_config.pipelines = None
    validation = ValidationModule(
        dataset_split_name=DatasetSplitName.eval,
        config=simple_text_config,
        mod_options=ModuleOptions(pipeline_index=None),
    )
    [result] = validation.compute_on_dataset_split()
    assert not result.can_load_model
    assert result.can_load_dataset
    assert not result.model_has_correct_type
    assert not result.can_make_prediction
    assert not result.can_make_saliency
