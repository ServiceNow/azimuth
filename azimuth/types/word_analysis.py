# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from enum import Enum
from typing import List

from pydantic import Field

from azimuth.types.general.alias_model import AliasModel, ModuleResponse


class TokensToWordsResponse(ModuleResponse):
    words: List[str] = Field(..., title="Words")
    saliency: List[float] = Field(..., title="Saliency")


class TopWordsResult(AliasModel):
    word: str = Field(..., title="Word")
    count: int = Field(..., title="Count")


class TopWordsImportanceCriteria(str, Enum):
    salient = "salient"
    frequent = "frequent"


class TopWordsResponse(ModuleResponse):
    all: List[TopWordsResult] = Field(..., title="All")
    right: List[TopWordsResult] = Field(..., title="Right")
    errors: List[TopWordsResult] = Field(..., title="Errors")
    importance_criteria: TopWordsImportanceCriteria = Field(..., title="Importance criteria")
