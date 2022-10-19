# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from fastapi import FastAPI
from starlette.testclient import TestClient


def test_get_similar(app: FastAPI) -> None:
    client = TestClient(app)
    resp = client.get("/dataset_splits/eval/utterances/1/similar_utterances?limit=2").json()
    resp = resp["utterances"]
    # We are not our own neighbors
    assert 1 not in [r["index"] for r in resp]
    assert len(resp) == 2

    resp = client.get(
        "/dataset_splits/eval/utterances/1/similar_utterances?limit=2&neighbors_dataset_split_name"
        "=eval"
    ).json()["utterances"]
    # We are not our own neighbors
    assert 1 not in [r["index"] for r in resp]
    assert len(resp) == 2

    resp = client.get(
        "/dataset_splits/eval/utterances/1/similar_utterances?limit=2&neighbors_dataset_split_name"
        "=train"
    ).json()["utterances"]
    assert len(resp) == 2


def test_utterances(app: FastAPI):
    client = TestClient(app)
    resp = client.get("/dataset_splits/eval/utterances").json()
    assert len(resp["utterances"]) == 42
    assert resp["utteranceCount"] == 42
    first_idx = resp["utterances"][0]["index"]

    resp = client.get("/dataset_splits/eval/utterances?pipeline_index=0&sort=confidence").json()
    first_idx_sorted = resp["utterances"][0]["index"]
    assert first_idx_sorted != first_idx

    # The `sort=confidence` is ignored because no pipeline is specified
    resp = client.get("/dataset_splits/eval/utterances?sort=confidence").json()
    first_idx_ignored = resp["utterances"][0]["index"]
    assert first_idx_ignored == first_idx

    resp = client.get("/dataset_splits/eval/utterances?limit=10&offset=10").json()
    assert len(resp["utterances"]) == 10
    assert resp["utteranceCount"] == 42
    assert resp["utterances"][0]["index"] == 10

    resp = client.get("/dataset_splits/eval/utterances?limit=10&offset=100").json()
    assert len(resp["utterances"]) == 0
    assert resp["utteranceCount"] == 42

    resp = client.get("/dataset_splits/eval/utterances?limit=3")
    assert resp.status_code == 400

    resp = client.get("/dataset_splits/eval/utterances?offset=3")
    assert resp.status_code == 400


def test_get_utterances(app: FastAPI, monkeypatch):
    import azimuth.routers.v1.utterances as utt_module

    monkeypatch.setattr(utt_module, "saliency_available", lambda x: True)
    client = TestClient(app)
    resp = client.get("/dataset_splits/eval/utterances?pipeline_index=0").json()
    assert len(resp["utterances"]) == 42

    first_utterance = resp["utterances"][0]
    assert len(first_utterance["modelPrediction"]["modelPredictions"]) == 2
    assert len(first_utterance["modelSaliency"]) == 2


def test_get_utterances_empty_filters(app: FastAPI):
    client = TestClient(app)
    resp = client.get("/dataset_splits/eval/utterances?utterance=yukongold").json()
    assert len(resp["utterances"]) == 0

    # This used to fail when we were filtering on an empty dataset
    resp = client.get(
        "/dataset_splits/eval/utterances?utterance=yukongold&data_action=relabel"
    ).json()
    assert len(resp["utterances"]) == 0


def test_get_utterances_no_pipeline(app: FastAPI, monkeypatch):
    import azimuth.routers.v1.utterances as utt_module

    monkeypatch.setattr(utt_module, "saliency_available", lambda x: True)
    client = TestClient(app)
    resp = client.get("/dataset_splits/eval/utterances").json()
    assert len(resp["utterances"]) == 42
    assert all(
        item["modelPrediction"] is None and item["modelSaliency"] is None
        for item in resp["utterances"]
    )


def test_perturbed_utterances(app: FastAPI, monkeypatch):
    client = TestClient(app)
    resp = client.get(
        "/dataset_splits/eval/utterances/1/perturbed_utterances?pipeline_index=0"
    ).json()
    # Utterance 1 has 15 perturbation tests
    assert len(resp) == 15
