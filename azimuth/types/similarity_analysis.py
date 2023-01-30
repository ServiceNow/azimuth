# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import List, Optional, Tuple

from pydantic import Field

from azimuth.types import AliasModel, Array, ModuleResponse
from azimuth.types.utterance import BaseUtterance


class SimilarUtterance(BaseUtterance):
    postprocessed_prediction: Optional[str] = Field(..., nullable=True)
    postprocessed_confidence: Optional[float] = Field(..., nullable=True)
    similarity: float


class SimilarUtterancesResponse(AliasModel):
    utterances: List[SimilarUtterance] = Field(..., title="Closest utterances")


class FAISSResponse(ModuleResponse):
    features: Array[float]


class NeighborsResponse(ModuleResponse):
    train_neighbors: List[Tuple[int, float]]
    eval_neighbors: List[Tuple[int, float]]
