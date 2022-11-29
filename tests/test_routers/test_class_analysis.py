# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from fastapi import FastAPI
from starlette.status import HTTP_200_OK
from starlette.testclient import TestClient


def test_class_analysis_plot_route(app: FastAPI) -> None:
    client = TestClient(app)

    resp = client.get("/class_analysis/plot")
    assert resp.status_code == HTTP_200_OK, resp.text
    data = resp.json()

    assert data["defaultOverlapThreshold"] is not None
    assert list(data["plot"].keys()) == ["data", "layout"]


def test_class_analysis_route(app: FastAPI) -> None:
    client = TestClient(app)

    resp_no_pipeline = client.get("/class_analysis")  # Dataset only, no pipeline
    assert resp_no_pipeline.status_code == HTTP_200_OK, resp_no_pipeline.text
    data_no_pipeline = resp_no_pipeline.json()

    assert data_no_pipeline == {
        "classPairs": [
            {
                "sourceClass": "negative",
                "targetClass": "positive",
                "overlapScoreTrain": 0.22608695652173913,
                "pipelineConfusionEval": None,
                "utteranceCountSourceTrain": 23,
                "utteranceCountSourceEval": 22,
                "utteranceCountWithOverlapTrain": 16,
            },
            {
                "sourceClass": "positive",
                "targetClass": "negative",
                "overlapScoreTrain": 0.4421052631578947,
                "pipelineConfusionEval": None,
                "utteranceCountSourceTrain": 19,
                "utteranceCountSourceEval": 20,
                "utteranceCountWithOverlapTrain": 16,
            },
        ]
    }

    resp_pipeline_0 = client.get("/class_analysis?pipeline_index=0")
    assert resp_pipeline_0.status_code == HTTP_200_OK, resp_pipeline_0.text
    data_pipeline_0 = resp_pipeline_0.json()

    assert data_pipeline_0 == {
        "classPairs": [
            {
                "sourceClass": "negative",
                "targetClass": "positive",
                "overlapScoreTrain": 0.22608695652173913,
                "pipelineConfusionEval": 3,
                "utteranceCountSourceTrain": 23,
                "utteranceCountSourceEval": 22,
                "utteranceCountWithOverlapTrain": 16,
            },
            {
                "sourceClass": "positive",
                "targetClass": "negative",
                "overlapScoreTrain": 0.4421052631578947,
                "pipelineConfusionEval": 1,
                "utteranceCountSourceTrain": 19,
                "utteranceCountSourceEval": 20,
                "utteranceCountWithOverlapTrain": 16,
            },
        ]
    }
