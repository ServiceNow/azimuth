from typing import Any, List, Optional

import torch
from datasets import Dataset
from transformers import TextClassificationPipeline

from azimuth.config import ModelContractConfig
from azimuth.modules.base_classes import AggregationModule
from azimuth.modules.model_contract_task_mapping import model_contract_task_mapping
from azimuth.types import ModuleOptions, SupportedMethod, SupportedModelContract
from azimuth.types.validation import ValidationResponse
from azimuth.utils.logs import MultipleExceptions
from azimuth.utils.validation import assert_not_none


class ExceptionGatherer:
    """Utilities to gather exception without raising."""

    def __init__(self):
        self.exceptions = []

    def has_exception(self):
        return len(self.exceptions) > 0

    def try_calling_function(self, fn, *args, **kwargs) -> Optional[Any]:
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            self.exceptions.append(e)
            return None


class ValidationModule(AggregationModule[ModelContractConfig]):
    def compute_on_dataset_split(self) -> List[ValidationResponse]:  # type: ignore
        cuda_available = torch.cuda.is_available()
        exception_gatherer = ExceptionGatherer()

        model = (
            exception_gatherer.try_calling_function(self.get_model)
            if self.config.pipelines is not None
            else None
        )
        can_load_model = model is not None
        dataset: Optional[Dataset] = exception_gatherer.try_calling_function(self.get_dataset_split)
        can_load_dataset = dataset is not None
        if can_load_model:
            model_has_correct_type = (
                exception_gatherer.try_calling_function(self._validate_model_type, model)
                is not None
            )
        else:
            model_has_correct_type = False

        if can_load_model and can_load_dataset and model_has_correct_type:
            ds_object = assert_not_none(dataset)
            batch = ds_object.select(range(0, min(10, len(ds_object))))
            can_make_prediction = (
                exception_gatherer.try_calling_function(self._validate_prediction, batch=batch)
                is not None
            )
            if can_make_prediction:
                can_make_saliency = (
                    exception_gatherer.try_calling_function(self._validate_saliency, batch=batch)
                    is not None
                )
            else:
                can_make_saliency = False
        else:
            can_make_prediction = False
            can_make_saliency = False

        # Should we raise instead?
        if exception_gatherer.exceptions:
            raise MultipleExceptions(exceptions=exception_gatherer.exceptions)
        return [
            ValidationResponse(
                is_cuda_available=cuda_available,
                can_load_model=can_load_model,
                can_load_dataset=can_load_dataset,
                model_has_correct_type=model_has_correct_type,
                can_make_prediction=can_make_prediction,
                can_make_saliency=can_make_saliency,
            )
        ]

    def _validate_prediction(self, batch):
        prediction_module = model_contract_task_mapping(
            dataset_split_name=self.dataset_split_name,
            config=self.config,
            mod_options=ModuleOptions(
                pipeline_index=self.mod_options.pipeline_index,
                model_contract_method_name=SupportedMethod.Predictions,
            ),
        )
        return prediction_module.compute(batch)

    def _validate_saliency(self, batch):
        prediction_module = model_contract_task_mapping(
            dataset_split_name=self.dataset_split_name,
            config=self.config,
            mod_options=ModuleOptions(
                pipeline_index=self.mod_options.pipeline_index,
                model_contract_method_name=SupportedMethod.Saliency,
            ),
        )
        return prediction_module.compute(batch)

    def _validate_model_type(self, model):
        if self.config.model_contract == SupportedModelContract.hf_text_classification:
            if isinstance(model, TextClassificationPipeline):
                model_has_correct_type = True
            else:
                raise ValueError(
                    f"Expected model to be of type "
                    f"transformers.TextClassificationPipeline, got {type(model)}"
                )
        else:
            if callable(model):
                model_has_correct_type = True
            else:
                raise ValueError(f"Expected model to be Callable, got {type(model)}")
        return model_has_correct_type
