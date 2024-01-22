# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from fastapi import FastAPI
from starlette.status import HTTP_200_OK, HTTP_404_NOT_FOUND
from starlette.testclient import TestClient

from azimuth.routers.utterances import UtterancesSortableColumn
from azimuth.types import DatasetSplitName
from azimuth.types.outcomes import OutcomeName
from azimuth.types.tag import ALL_DATA_ACTION_FILTERS, ALL_SMART_TAG_FILTERS
from tests.utils import get_enum_validation_error_msg


def test_openapi(app: FastAPI):
    # Check that we can generate the openapi.json
    client = TestClient(app)
    resp = client.get("/openapi.json")
    assert resp.status_code == HTTP_200_OK, resp.text


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
        "utteranceCountPerDatasetSplit": {"eval": 42, "train": 42},
        "modelContract": "custom_text_classification",
        "perturbationTestingAvailable": True,
        "postprocessingEditable": [False],
        "predictionAvailable": True,
        "projectName": "sentiment-analysis",
        "dataActions": ALL_DATA_ACTION_FILTERS,
        "similarityAvailable": True,
        "smartTags": ALL_SMART_TAG_FILTERS,
        "modelAveragingAvailable": False,
    }


def test_perturbation_summary(app: FastAPI) -> None:
    client = TestClient(app)

    resp = client.get("/perturbation_testing_summary?pipeline_index=0").json()

    assert len(resp) == 2


def test_custom_metrics_definition(app: FastAPI):
    client = TestClient(app)
    resp = client.get("/custom_metrics_info").json()

    assert not {"Precision", "Recall"}.difference(resp.keys())
    assert all(v["description"] != "" for v in resp.values())


def test_validation_error(app: FastAPI):
    client = TestClient(app)

    resp = client.get("/dataset_splits/c/utterances?outcome=a&outcome=b&sort=d&pipeline_index=0")
    assert resp.status_code == HTTP_404_NOT_FOUND, resp.text
    assert resp.json()["detail"] == (
        f"query parameter outcome=a: {get_enum_validation_error_msg(OutcomeName)}\n"
        f"query parameter outcome=b: {get_enum_validation_error_msg(OutcomeName)}\n"
        f"path parameter dataset_split_name=c: {get_enum_validation_error_msg(DatasetSplitName)}\n"
        f"query parameter sort=d: {get_enum_validation_error_msg(UtterancesSortableColumn)}"
    )
