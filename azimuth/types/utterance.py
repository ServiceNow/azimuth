# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import List, Optional, Union

from pydantic import Field

from azimuth.types import AliasModel
from azimuth.types.model_performance import (
    ValuePerDatasetSmartTag,
    ValuePerPipelineSmartTag,
)
from azimuth.types.outcomes import OutcomeName
from azimuth.types.tag import DataAction
from azimuth.utils.ml.postprocessing import PostprocessingStepAPIResponse
from azimuth.utils.ml.preprocessing import PreprocessingStepAPIResponse


class ModelPrediction(AliasModel):
    model_predictions: List[str] = Field(..., tittle="Model Predictions")
    postprocessed_prediction: str = Field(..., title="Postprocessed prediction")
    model_confidences: List[float] = Field(..., tittle="Model Confidences")
    postprocessed_confidences: List[float] = Field(..., tittle="Postprocessed Confidences")
    model_outcome: OutcomeName = Field(..., title="Model Outcome")
    postprocessed_outcome: OutcomeName = Field(..., title="Postprocessed Outcome")
    preprocessing_steps: List[PreprocessingStepAPIResponse] = Field(
        ..., title="Preprocessing Steps"
    )
    postprocessing_steps: List[PostprocessingStepAPIResponse] = Field(
        ..., title="Postprocessing Steps"
    )


class ModelSaliency(AliasModel):
    tokens: List[str] = Field(..., title="Tokens")
    saliencies: List[float] = Field(..., title="Saliency")


class Utterance(ValuePerDatasetSmartTag[str], ValuePerPipelineSmartTag[str], AliasModel):
    index: int = Field(..., title="Index", description="Row index computed by Azimuth..")
    # Union[int, str] in this order so FastAPI tries to cast to int() first, then str().
    # If it was reversed, everything would get converted to strings since str() always works.
    persistent_id: Union[int, str] = Field(..., title="Persistent id")
    model_prediction: Optional[ModelPrediction] = Field(
        ..., title="Model prediction", nullable=True
    )
    model_saliency: Optional[ModelSaliency] = Field(..., title="Model saliency", nullable=True)
    data_action: DataAction = Field(..., title="Data action tag")
    label: str = Field(..., title="Label")
    utterance: str = Field(..., title="Utterance")


class GetUtterancesResponse(AliasModel):
    utterances: List[Utterance] = Field(..., title="Utterances")
    utterance_count: int = Field(..., title="Utterance count")
    confidence_threshold: Optional[float] = Field(
        ..., title="Confidence threshold in selected pipeline (if any)", nullable=True
    )

    class Config:
        schema_extra = {
            "example": {
                "utterances": [
                    {
                        "index": 1,
                        "modelPrediction": {
                            "modelPredictions": ["dog", "cat", "other"],
                            "postprocessedPrediction": 18,
                            "modelConfidences": [0.6, 0.3, 0.1],
                            "postprocessedConfidences": [0.6, 0.3, 0.1],
                            "model_outcome": "IncorrectAndPredicted",
                            "postprocessed_outcome": "IncorrectAndPredicted",
                        },
                        "data_action": None,
                        "smartTags": ["missing_verb"],
                        "label": 0,
                        "utterance": "this movie good.",
                        "modelSaliency": {
                            "tokens": ["[CLS]", "this", "movie", "good", ".", "[SEP]"],
                            "saliencies": [
                                0.04012051224708557,
                                0.13875797390937805,
                                0.46019017696380615,
                                0.1719111204147339,
                                0.08197823911905289,
                                0.10704188048839569,
                            ],
                        },
                    },
                    {
                        "index": 2,
                        "modelPrediction": {
                            "modelPredictions": ["cat", "dog", "other"],
                            "postprocessedPrediction": 0,
                            "modelConfidences": [0.5, 0.3, 0.2],
                            "postprocessedConfidences": [0.5, 0.3, 0.2],
                            "model_outcome": "CorrectAndPredicted",
                            "postprocessed_outcome": "CorrectAndPredicted",
                        },
                        "data_action": None,
                        "smartTags": ["multiple_sentences"],
                        "label": 0,
                        "utterance": "this movie is bad. i hate it.",
                        "modelSaliency": {
                            "tokens": [
                                "[CLS]",
                                "this",
                                "movie",
                                "is",
                                "bad",
                                ".",
                                "i",
                                "hat",
                                "##e",
                                "it",
                                ".",
                                "[SEP]",
                            ],
                            "saliencies": [
                                0.02849223092198372,
                                0.07048150897026062,
                                0.31859099864959717,
                                0.07001485675573349,
                                0.16567286849021912,
                                0.049969661980867386,
                                0.043877504765987396,
                                0.05950620397925377,
                                0.03894789144396782,
                                0.050555672496557236,
                                0.04821440204977989,
                                0.05567614734172821,
                            ],
                        },
                    },
                ],
                "utterance_count": 2,
            }
        }
