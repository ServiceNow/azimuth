# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import List

from pydantic import Field

from azimuth.types import AliasModel, ModuleResponse
from azimuth.utils.ml.postprocessing import PostProcessingIO, PostprocessingStep
from azimuth.utils.ml.preprocessing import PreprocessingStep


class Prediction(AliasModel):
    class_index: int
    confidence: float


class PredictionResponse(ModuleResponse):
    entropy: float = Field(..., title="Entropy")
    epistemic: float = Field(..., title="Epistemic")
    label: int = Field(..., title="Label")
    model_output: PostProcessingIO = Field(..., title="Output before post-processing")
    postprocessed_output: PostProcessingIO = Field(..., title="Output after post-processing")
    preprocessing_steps: List[PreprocessingStep] = Field(..., title="Preprocessing Steps")
    postprocessing_steps: List[PostprocessingStep] = Field(..., title="Postprocessing Steps")


class SaliencyResponse(ModuleResponse):
    saliency: List[float] = Field(..., title="Saliency")
    tokens: List[str] = Field(..., title="Tokens")
