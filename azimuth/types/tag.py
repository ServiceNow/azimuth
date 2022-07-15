# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from enum import Enum
from typing import Any, Dict, List

from pydantic import Field

from azimuth.types import AliasModel, DatasetSplitName, ModuleResponse


class DataActionMapping(AliasModel):
    relabel: bool = Field(..., title="Relabel")
    consider_new_class: bool = Field(..., title="Consider New Class")
    remove: bool = Field(..., title="Remove")
    augment_with_similar: bool = Field(..., title="Augment with Similar")
    investigate: bool = Field(..., title="Investigate")


class DataAction(str, Enum):
    relabel = "relabel"
    consider_new_class = "consider_new_class"
    remove = "remove"
    augment_with_similar = "augment_with_similar"
    investigate = "investigate"
    # Always last for sorting purposes
    no_action = "NO_ACTION"


class SmartTag(str, Enum):
    # Syntax
    multi_sent = "multiple_sentences"
    long = "long_sentence"
    short = "short_sentence"
    no_subj = "missing_subj"
    no_obj = "missing_obj"
    no_verb = "missing_verb"
    # Similar
    conflicting_neighbors_train = "conflicting_neighbors_train"
    conflicting_neighbors_eval = "conflicting_neighbors_eval"
    no_close_train = "no_close_train"
    no_close_eval = "no_close_eval"
    # Perturbation testing
    failed_punctuation = "failed_punctuation"
    failed_fuzzy_matching = "failed_fuzzy_matching"
    # Bayesian model averaging
    high_epistemic_uncertainty = "high_epistemic_uncertainty"
    # Prediction
    correct_top_3 = "correct_top_3"
    correct_low_conf = "correct_low_conf"
    # Pipeline Comparison
    incorrect_for_all_pipelines = "incorrect_for_all_pipelines"
    pipeline_disagreement = "pipeline_disagreement"
    # Always last for sorting purposes
    no_smart_tag = "NO_SMART_TAGS"


class SmartTagFamily(str, Enum):
    extreme_length = "extreme_length"
    partial_syntax = "partial_syntax"
    dissimilar = "dissimilar"
    almost_correct = "almost_correct"
    behavioral_testing = "behavioral_testing"
    pipeline_comparison = "pipeline_comparison"
    uncertain = "uncertain"


DATASET_SMART_TAG_FAMILIES = [
    SmartTagFamily.extreme_length,
    SmartTagFamily.partial_syntax,
    SmartTagFamily.dissimilar,
]
PIPELINE_SMART_TAG_FAMILIES = [
    SmartTagFamily.almost_correct,
    SmartTagFamily.behavioral_testing,
    SmartTagFamily.pipeline_comparison,
    SmartTagFamily.uncertain,
]

Tag = str
ALL_DATA_ACTION_FILTERS = [a.value for a in DataAction]
ALL_DATA_ACTIONS = [a for a in ALL_DATA_ACTION_FILTERS if a != DataAction.no_action]

ALL_SMART_TAG_FILTERS = [a.value for a in SmartTag]
ALL_SMART_TAGS = [a for a in ALL_SMART_TAG_FILTERS if a != SmartTag.no_smart_tag]

ALL_TAGS = ALL_SMART_TAGS + ALL_DATA_ACTIONS

SMART_TAGS_FAMILY_MAPPING = {
    SmartTagFamily.extreme_length: [
        SmartTag.multi_sent,
        SmartTag.short,
        SmartTag.long,
    ],
    SmartTagFamily.partial_syntax: [
        SmartTag.no_verb,
        SmartTag.no_subj,
        SmartTag.no_obj,
    ],
    SmartTagFamily.dissimilar: [
        SmartTag.conflicting_neighbors_train,
        SmartTag.conflicting_neighbors_eval,
        SmartTag.no_close_train,
        SmartTag.no_close_eval,
    ],
    SmartTagFamily.almost_correct: [
        SmartTag.correct_top_3,
        SmartTag.correct_low_conf,
    ],
    SmartTagFamily.behavioral_testing: [
        SmartTag.failed_punctuation,
        SmartTag.failed_fuzzy_matching,
    ],
    SmartTagFamily.pipeline_comparison: [
        SmartTag.pipeline_disagreement,
        SmartTag.incorrect_for_all_pipelines,
    ],
    SmartTagFamily.uncertain: [
        SmartTag.high_epistemic_uncertainty,
    ],
}

ALL_SYNTAX_TAGS = [
    *SMART_TAGS_FAMILY_MAPPING[SmartTagFamily.extreme_length],
    *SMART_TAGS_FAMILY_MAPPING[SmartTagFamily.partial_syntax],
]
ALL_PREDICTION_TAGS: List[Tag] = [
    tag for family in PIPELINE_SMART_TAG_FAMILIES for tag in SMART_TAGS_FAMILY_MAPPING[family]
]
ALL_STANDARD_TAGS = list(set(ALL_TAGS) - set(ALL_PREDICTION_TAGS))


class TaggingResponse(ModuleResponse):
    tags: Dict[str, bool]
    adds: Dict[str, Any]


class DataActionResponse(AliasModel):
    data_actions: List[DataActionMapping] = Field(..., title="Data action tags")


class PostDataActionRequest(AliasModel):
    dataset_split_name: DatasetSplitName = Field(DatasetSplitName.eval, title="Dataset Split Name")
    data_actions: Dict[int, Dict[str, bool]] = Field(..., title="Data action tags")

    class Config:
        schema_extra = {
            "example": {
                "dataset_split_name": "eval",
                "data_actions": {
                    1: {
                        "relabel": True,
                        "consider_new_class": True,
                        "remove": True,
                        "augment_with_similar": True,
                        "investigate": True,
                    }
                },
            }
        }
