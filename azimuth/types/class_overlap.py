# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import Dict, List, Optional

from pydantic import Field

from azimuth.types import AliasModel, Array, PlotSpecification


class SimilarityArrays(AliasModel):
    sample_probability: Array
    sample_probability_norm: Array


class ClassOverlapResponse(AliasModel):
    evals: Array
    evecs: Array
    difference: Array
    s_matrix: Array
    similarity_arrays: Dict[int, Dict[int, SimilarityArrays]]

    class Config:
        arbitrary_types_allowed = True


class ClassOverlapPlotResponse(AliasModel):
    plot: PlotSpecification
    default_overlap_threshold: float


class ClassOverlapTableClassPair(AliasModel):
    source_class: str = Field(..., title="Source class")
    target_class: str = Field(..., title="Target class")
    overlap_score_train: float = Field(..., title="Overlap score on train")
    pipeline_confusion_eval: Optional[int] = Field(
        ..., title="Pipeline confusion not normalized on eval", nullable=True
    )
    utterance_count_source_train: int = Field(
        ..., title="Utterance count for source training class"
    )
    utterance_count_source_eval: int = Field(..., title="Utterance count for source eval class")
    utterance_count_with_overlap_train: int = Field(
        ..., title="Utterance count with overlap on train"
    )


class ClassOverlapTableResponse(AliasModel):
    class_pairs: List[ClassOverlapTableClassPair] = Field(..., title="Class pair overlap data")
