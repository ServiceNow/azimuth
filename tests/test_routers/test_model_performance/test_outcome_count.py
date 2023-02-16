# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from fastapi import FastAPI
from starlette.status import HTTP_200_OK, HTTP_400_BAD_REQUEST
from starlette.testclient import TestClient


def test_get_outcome_count_per_threshold(app: FastAPI) -> None:
    client = TestClient(app)

    resp = client.get("/dataset_splits/eval/outcome_count/per_threshold?pipeline_index=0")
    assert resp.status_code == HTTP_400_BAD_REQUEST, resp.text


def test_get_outcome_count_per_filter(app: FastAPI) -> None:
    client = TestClient(app)
    resp = client.get("/dataset_splits/eval/outcome_count/per_filter?pipeline_index=0")
    assert resp.status_code == HTTP_200_OK, resp.text
    data = resp.json()
    metrics = data.pop("countPerFilter")
    assert "label" in metrics and len(metrics["label"]) == 3


def test_outcome_count_empty_filters(app: FastAPI):
    client = TestClient(app)
    resp = client.get(
        "/dataset_splits/eval/outcome_count/per_filter?pipeline_index=0&utterance=yukongold"
    )
    assert resp.status_code == HTTP_200_OK, resp.text
    data = resp.json()
    assert data["utteranceCount"] == 0

    # This used to fail when we were filtering on an empty dataset
    resp = client.get(
        "/dataset_splits/eval/outcome_count/per_filter"
        "?pipeline_index=0&utterance=yukongold&data_action=relabel"
    )
    assert resp.status_code == HTTP_200_OK, resp.text
    data = resp.json()
    assert data["utteranceCount"] == 0
