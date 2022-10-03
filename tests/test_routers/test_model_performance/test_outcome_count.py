# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from fastapi import FastAPI
from starlette.status import HTTP_200_OK
from starlette.testclient import TestClient


def test_get_outcome_count_per_threshold(app: FastAPI) -> None:
    client = TestClient(app)

    resp = client.get("/dataset_splits/eval/outcome_count/per_threshold?pipeline_index=0")
    assert resp.status_code == HTTP_200_OK, resp.text
    data = resp.json()
    # app does not have an editable postprocessing.
    assert len(data) == 0


def test_get_outcome_count_per_filter(app: FastAPI) -> None:
    client = TestClient(app)
    resp = client.get("/dataset_splits/eval/outcome_count/per_filter?pipeline_index=0")
    assert resp.status_code == HTTP_200_OK, resp.text
    data = resp.json()
    metrics = data.pop("countPerFilter")
    assert "label" in metrics and len(metrics["label"]) == 3


def test_empty_search_with_filters(app: FastAPI):
    client = TestClient(app)
    resp = client.get("/dataset_splits/eval/outcome_count?utterance=rrgeth").json()
    assert len(resp["utterances"]) == 0

    resp = client.get(
        "/dataset_splits/eval/outcome_count?utterance=rrgeth&data_action=relabel"
    ).json()
    assert len(resp["utterances"]) == 0
