# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from fastapi import FastAPI
from starlette.status import HTTP_200_OK
from starlette.testclient import TestClient

from azimuth.types.tag import SmartTag


def test_get_utterance_count_per_filter(app: FastAPI) -> None:
    client = TestClient(app)
    resp = client.get("/dataset_splits/eval/utterance_count/per_filter?pipelineIndex=0")
    assert resp.status_code == HTTP_200_OK, resp.text
    data = resp.json()
    metrics = data.pop("countPerFilter")
    assert "label" in metrics and len(metrics["label"]) == 3
    assert "dissimilar" in metrics and len(metrics["dissimilar"]) == 5
    assert "extremeLength" in metrics and len(metrics["extremeLength"]) == 4
    assert metrics["extremeLength"][0]["filterValue"] == SmartTag.no_smart_tag
    assert metrics["extremeLength"][0]["utteranceCount"] > 0

    resp = client.get("/dataset_splits/eval/utterance_count/per_filter")
    assert resp.status_code == HTTP_200_OK, resp.text
    data = resp.json()
    metrics = data.pop("countPerFilter")
    assert "label" in metrics and len(metrics["label"]) == 3
    assert "dissimilar" in metrics and len(metrics["dissimilar"]) == 5
    assert "extremeLength" in metrics and len(metrics["extremeLength"]) == 4
    assert "prediction" not in metrics and "outcome" not in metrics and "uncertain" not in metrics

    resp = client.get(
        "/dataset_splits/eval/utterance_count/per_filter?pipelineIndex=0&label=positive"
    )
    assert resp.status_code == HTTP_200_OK, resp.text
    data = resp.json()
    metrics = data.pop("countPerFilter")
    assert "label" in metrics and len(metrics["label"]) == 3
    assert metrics["label"][0]["utteranceCount"] == 0  # Rejection class
    assert metrics["label"][1]["utteranceCount"] == data["utteranceCount"]  # Positive
    assert metrics["label"][2]["utteranceCount"] == 0  # Negative
