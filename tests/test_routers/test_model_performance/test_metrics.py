# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from fastapi import FastAPI
from starlette.status import HTTP_200_OK
from starlette.testclient import TestClient

common_metric_response = {
    "customMetrics": {
        "F1": 0.12349206349206351,
        "Precision": 0.4682539682539682,
        "Recall": 0.07142857142857142,
    },
    "ece": 0.5196982765240196,
    "outcomeCount": {
        "CorrectAndPredicted": 3,
        "CorrectAndRejected": 0,
        "IncorrectAndPredicted": 4,
        "IncorrectAndRejected": 35,
    },
    "utteranceCount": 42,
}


def test_get_metrics(app: FastAPI) -> None:
    client = TestClient(app)

    resp = client.get("/dataset_splits/eval/metrics?pipelineIndex=0")
    assert resp.status_code == HTTP_200_OK, resp.text
    data = resp.json()
    _ = data.pop("ecePlot")
    assert data == common_metric_response


def test_get_metrics_per_filter(app: FastAPI) -> None:
    client = TestClient(app)
    resp = client.get("/dataset_splits/eval/metrics/per_filter?pipelineIndex=0")
    assert resp.status_code == HTTP_200_OK, resp.text
    data = resp.json()

    assert data["metricsOverall"][0] == dict(**common_metric_response, filterValue="overall")

    metrics_per_filter = data.pop("metricsPerFilter")
    assert "label" in metrics_per_filter and len(metrics_per_filter["label"]) == 3
