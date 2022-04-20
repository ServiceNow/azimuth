# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import List

from pydantic import Field

from azimuth.types import AliasModel, ModuleResponse
from azimuth.utils.ml.postprocessing import PostProcessingIO


class Prediction(AliasModel):
    class_index: int
    confidence: float


class PredictionResponse(ModuleResponse):
    entropy: float = Field(..., title="Entropy")
    epistemic: float = Field(..., title="Epistemic")
    label: int = Field(..., title="Label")
    model_output: PostProcessingIO = Field(..., title="Output before post-processing")
    postprocessed_output: PostProcessingIO = Field(..., title="Output after post-processing")


class SaliencyResponse(ModuleResponse):
    saliency: List[float] = Field(..., title="Saliency")
    tokens: List[str] = Field(..., title="Tokens")
