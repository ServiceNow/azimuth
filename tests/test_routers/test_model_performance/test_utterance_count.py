# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from fastapi import FastAPI
from starlette.status import HTTP_200_OK
from starlette.testclient import TestClient


def test_get_utterance_count_per_filter(app: FastAPI) -> None:
    client = TestClient(app)
    resp = client.get("/dataset_splits/eval/utterance_count/per_filter?pipelineIndex=0")
    assert resp.status_code == HTTP_200_OK, resp.text
    data = resp.json()
    metrics = data.pop("countPerFilter")
    assert "label" in metrics and len(metrics["label"]) == 3
    assert (
        "smartTag" in metrics
        and sum(
            [
                sum(tag["utteranceCount"] for tag in tag_family)
                for tag_family in metrics["smartTag"].values()
            ]
        )
        > 0
    )

    resp = client.get("/dataset_splits/eval/utterance_count/per_filter")
    assert resp.status_code == HTTP_200_OK, resp.text
    data = resp.json()
    metrics = data.pop("countPerFilter")
    assert "label" in metrics and len(metrics["label"]) == 3
    assert metrics["prediction"] is None and metrics["outcome"] is None

    resp = client.get(
        "/dataset_splits/eval/utterance_count/per_filter?pipelineIndex=0&labels=positive"
    )
    assert resp.status_code == HTTP_200_OK, resp.text
    data = resp.json()
    metrics = data.pop("countPerFilter")
    assert "label" in metrics and len(metrics["label"]) == 3
    assert metrics["label"][0]["utteranceCount"] == 0  # Rejection class
    assert metrics["label"][1]["utteranceCount"] == data["utteranceCount"]  # Positive
    assert metrics["label"][2]["utteranceCount"] == 0  # Negative
