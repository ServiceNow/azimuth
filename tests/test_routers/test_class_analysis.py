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

    resp_pipeline_0 = client.get("/class_analysis?pipeline_index=0")
    assert resp_pipeline_0.status_code == HTTP_200_OK, resp_pipeline_0.text
    data_pipeline_0 = resp_pipeline_0.json()

    assert set(data_no_pipeline["classPairs"][0].keys()) == {
        "sourceClass",
        "targetClass",
        "overlapScoreTrain",
        "pipelineConfusionEval",
        "utteranceCountSourceTrain",
        "utteranceCountSourceEval",
        "utteranceCountWithOverlapTrain",
    }
    assert (
        data_no_pipeline["classPairs"][0]["sourceClass"]
        != data_pipeline_0["classPairs"][0]["targetClass"]
    ), "Table should not contain rows where class A == class B."
    assert isinstance(
        data_no_pipeline["classPairs"][0]["overlapScoreTrain"], float
    ), "Overlap score should exist as a float."
    assert isinstance(
        data_no_pipeline["classPairs"][0]["utteranceCountSourceTrain"], int
    ), "Sample count should be an integer."
    assert (
        data_no_pipeline["classPairs"][0]["pipelineConfusionEval"] is None
    ), "There should not be a confusion value when no pipeline is not supplied."
    assert isinstance(
        data_pipeline_0["classPairs"][0]["pipelineConfusionEval"], int
    ), "Data should have confusion values when a pipeline is supplied."
