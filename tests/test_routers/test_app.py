# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from fastapi import FastAPI
from starlette.status import HTTP_200_OK
from starlette.testclient import TestClient

from azimuth.types.tag import ALL_DATA_ACTIONS, ALL_SMART_TAGS


def test_openapi(app: FastAPI):
    # Check that we can generate the openapi.json
    client = TestClient(app)
    resp = client.get("/openapi.json")
    assert resp.status_code == 200


def test_get_status(app: FastAPI) -> None:
    client = TestClient(app)

    resp = client.get("/status")
    assert resp.status_code == HTTP_200_OK, resp.text
    data = resp.json()
    assert data["startupTasksReady"] is True
    assert all(
        status in ["not_started", "finished"] for status in data["startupTasksStatus"].values()
    )


def test_get_dataset_info(app: FastAPI) -> None:
    client = TestClient(app)

    resp = client.get("/dataset_info")
    assert resp.status_code == HTTP_200_OK, resp.text
    data = resp.json()
    statuses = data.pop("startupTasks")
    assert all(status in ["not_started", "finished"] for status in statuses.values())

    assert data == {
        "availableDatasetSplits": {"eval": True, "train": True},
        "classNames": ["negative", "positive", "REJECTION_CLASS"],
        "defaultThreshold": [None],
        "modelContract": "custom_text_classification",
        "perturbationTestingAvailable": True,
        "postprocessingEditable": [False],
        "predictionAvailable": True,
        "projectName": "sentiment-analysis",
        "dataActions": ALL_DATA_ACTIONS,
        "similarityAvailable": True,
        "smartTags": ALL_SMART_TAGS,
        "evalClassDistribution": [22, 20, 0],
        "trainClassDistribution": [23, 19, 0],
    }


def test_perturbation_summary(app: FastAPI) -> None:
    client = TestClient(app)

    resp = client.get("/perturbation_testing_summary?pipelineIndex=0").json()

    assert len(resp) == 2


def test_custom_metrics_definition(app: FastAPI):
    client = TestClient(app)
    resp = client.get("/custom_metrics_info").json()

    assert not {"Precision", "Recall"}.difference(resp.keys())
    assert all(v["description"] != "" for v in resp.values())
