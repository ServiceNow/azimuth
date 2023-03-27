# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import List

from fastapi import FastAPI
from starlette.status import HTTP_200_OK, HTTP_400_BAD_REQUEST, HTTP_404_NOT_FOUND
from starlette.testclient import TestClient

UTTERANCE_COUNT = 42


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


def is_sorted(numbers: List[float], descending=False):
    return all(a >= b if descending else a <= b for a, b in zip(numbers[:-1], numbers[1:]))


def test_get_utterances(app: FastAPI):
    client = TestClient(app)
    resp = client.get("/dataset_splits/eval/utterances").json()
    assert len(resp["utterances"]) == UTTERANCE_COUNT
    assert resp["utteranceCount"] == UTTERANCE_COUNT
    assert is_sorted([u["index"] for u in resp["utterances"]])
    for utterance in resp["utterances"]:
        assert utterance["persistentId"] == utterance["index"]


def test_get_utterances_sort_confidence(app: FastAPI):
    client = TestClient(app)
    resp = client.get("/dataset_splits/eval/utterances?pipeline_index=0&sort=confidence").json()
    assert len(resp["utterances"]) == UTTERANCE_COUNT
    assert resp["utteranceCount"] == UTTERANCE_COUNT
    assert is_sorted(
        [u["modelPrediction"]["postprocessedConfidences"][0] for u in resp["utterances"]]
    )

    resp = client.get(
        "/dataset_splits/eval/utterances?pipeline_index=0&sort=confidence"
        "&without_postprocessing=true"
    ).json()
    assert len(resp["utterances"]) == UTTERANCE_COUNT
    assert resp["utteranceCount"] == UTTERANCE_COUNT
    assert is_sorted([u["modelPrediction"]["modelConfidences"][0] for u in resp["utterances"]])


def test_get_utterances_sort_prediction(app: FastAPI):
    client = TestClient(app)
    resp = client.get("/dataset_splits/eval/utterances?pipeline_index=0&sort=prediction").json()
    assert len(resp["utterances"]) == UTTERANCE_COUNT
    assert resp["utteranceCount"] == UTTERANCE_COUNT
    assert is_sorted([u["modelPrediction"]["postprocessedPrediction"] for u in resp["utterances"]])

    resp = client.get(
        "/dataset_splits/eval/utterances?pipeline_index=0&sort=prediction"
        "&without_postprocessing=true"
    ).json()
    assert len(resp["utterances"]) == UTTERANCE_COUNT
    assert resp["utteranceCount"] == UTTERANCE_COUNT
    assert is_sorted([u["modelPrediction"]["modelPredictions"][0] for u in resp["utterances"]])


def test_get_utterances_sort_descending(app: FastAPI):
    client = TestClient(app)
    resp = client.get("/dataset_splits/eval/utterances?pipeline_index=0&descending=true").json()
    assert len(resp["utterances"]) == UTTERANCE_COUNT
    assert resp["utteranceCount"] == UTTERANCE_COUNT
    assert is_sorted([u["index"] for u in resp["utterances"]], descending=True)


def test_get_utterances_sort_unavailable_column(app: FastAPI):
    client = TestClient(app)
    # The `sort=confidence` is ignored because no pipeline is specified
    resp = client.get("/dataset_splits/eval/utterances?sort=confidence").json()
    assert len(resp["utterances"]) == UTTERANCE_COUNT
    assert resp["utteranceCount"] == UTTERANCE_COUNT
    assert is_sorted([u["index"] for u in resp["utterances"]])


def test_get_utterances_pagination(app: FastAPI):
    client = TestClient(app)

    resp = client.get("/dataset_splits/eval/utterances?limit=0&offset=0")
    assert resp.status_code == HTTP_400_BAD_REQUEST, resp.text

    resp = client.get("/dataset_splits/eval/utterances?limit=10&offset=-1")
    assert resp.status_code == HTTP_400_BAD_REQUEST, resp.text

    resp = client.get("/dataset_splits/eval/utterances?limit=10&offset=10").json()
    assert len(resp["utterances"]) == 10
    assert resp["utteranceCount"] == UTTERANCE_COUNT
    assert resp["utterances"][0]["index"] == 10

    resp = client.get("/dataset_splits/eval/utterances?limit=10&offset=100").json()
    assert len(resp["utterances"]) == 0
    assert resp["utteranceCount"] == UTTERANCE_COUNT

    resp = client.get("/dataset_splits/eval/utterances?limit=3")
    assert resp.status_code == 400

    resp = client.get("/dataset_splits/eval/utterances?offset=3")
    assert resp.status_code == 400


def test_get_utterances_filtering_and_indexing(app: FastAPI):
    client = TestClient(app)

    # Filtering on label
    resp = client.get("/dataset_splits/eval/utterances?label=negative").json()
    assert len(resp["utterances"]) == 22
    assert resp["utteranceCount"] == 22
    assert all(u["label"] == "negative" for u in resp["utterances"])

    # Filtering on prediction
    resp = client.get("/dataset_splits/eval/utterances?pipeline_index=0&prediction=negative").json()
    assert len(resp["utterances"]) == 3
    assert resp["utteranceCount"] == 3
    assert all(
        u["modelPrediction"]["postprocessedPrediction"] == "negative" for u in resp["utterances"]
    )

    # Filtering on index
    resp = client.get("/dataset_splits/eval/utterances?indices=3").json()
    assert len(resp["utterances"]) == 1
    assert resp["utteranceCount"] == 1
    assert resp["utterances"][0]["index"] == 3

    # Filtering on indices
    resp = client.get("/dataset_splits/eval/utterances?indices=3&indices=4").json()
    assert len(resp["utterances"]) == 2
    assert resp["utteranceCount"] == 2
    assert [res["index"] for res in resp["utterances"]] == [3, 4]

    # Filtering on label and index (not empty)
    resp = client.get("/dataset_splits/eval/utterances?label=positive&indices=3").json()
    assert len(resp["utterances"]) == 1
    assert resp["utteranceCount"] == 1
    assert resp["utterances"][0]["label"] == "positive"
    assert resp["utterances"][0]["index"] == 3

    # Filtering on label and index (empty)
    resp = client.get("/dataset_splits/eval/utterances?label=negative&indices=3").json()
    assert len(resp["utterances"]) == 0
    assert resp["utteranceCount"] == 0


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
    import azimuth.routers.utterances as utt_module

    monkeypatch.setattr(utt_module, "saliency_available", lambda x: True)
    client = TestClient(app)
    resp = client.get("/dataset_splits/eval/utterances").json()
    assert len(resp["utterances"]) == UTTERANCE_COUNT
    assert all(
        item["modelPrediction"] is None and item["modelSaliency"] is None
        for item in resp["utterances"]
    )


def test_perturbed_utterances(app: FastAPI, monkeypatch):
    client = TestClient(app)
    resp = client.get(
        "/dataset_splits/eval/utterances/1/perturbed_utterances?pipeline_index=0"
    ).json()
    # Utterance 1 has 11 perturbation tests
    assert len(resp) == 11


def test_patch_utterances(app: FastAPI) -> None:
    client = TestClient(app)

    request = [{"persistentId": 0, "dataAction": "remove"}]
    resp = client.patch("/dataset_splits/eval/utterances", json=request)
    assert resp.status_code == HTTP_200_OK, resp.text
    assert resp.json() == request

    # Set tag of a non-existent persistent-id (raise)
    request = [
        {"persistentId": "potato", "dataAction": "augment_with_similar"},
        {"persistentId": 0, "dataAction": "relabel"},
    ]
    resp = client.patch("/dataset_splits/eval/utterances", json=request)
    assert resp.status_code == HTTP_404_NOT_FOUND, resp.text

    # Set tag of a non-existent persistent-id (ignore)
    resp = client.patch("/dataset_splits/eval/utterances?ignore_not_found=true", json=request)
    assert resp.status_code == HTTP_200_OK, resp.text
    assert resp.json() == [request[1]]  # Only the second requested element was applied.

    # Reset tag to NO_ACTION
    request = [{"persistentId": 0, "dataAction": "NO_ACTION"}]
    resp = client.patch("/dataset_splits/eval/utterances", json=request)
    assert resp.status_code == HTTP_200_OK, resp.text
    assert resp.json() == request
