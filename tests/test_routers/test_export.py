# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from fastapi import FastAPI
from starlette.testclient import TestClient


def test_get_export(app: FastAPI) -> None:
    client = TestClient(app)
    resp = client.get("/export/dataset_splits/eval/utterances")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "text/csv; charset=utf-8"
    assert int(resp.headers["content-length"]) > 0
    assert "azimuth_export_sentiment-analysis_eval" in resp.headers["content-disposition"]


def test_get_report(app: FastAPI) -> None:
    client = TestClient(app)
    resp = client.get("/export/perturbation_testing_summary")
    assert resp.status_code == 422
    resp = client.get("/export/perturbation_testing_summary?pipeline_index=0")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "text/csv; charset=utf-8"
    assert int(resp.headers["content-length"]) > 0
    assert "behavioral_testing_summary" in resp.headers["content-disposition"]
    assert ".csv" in resp.headers["content-disposition"]


def test_get_utterances(app: FastAPI) -> None:
    client = TestClient(app)
    resp = client.get("/export/dataset_splits/eval/perturbed_utterances?pipeline_index=0")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/json"
    assert int(resp.headers["content-length"]) > 0
    assert "modified_set" in resp.headers["content-disposition"]
    assert ".json" in resp.headers["content-disposition"]
