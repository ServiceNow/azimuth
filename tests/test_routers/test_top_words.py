# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from fastapi import FastAPI
from starlette.status import HTTP_200_OK
from starlette.testclient import TestClient


def test_top_words(app: FastAPI) -> None:
    client = TestClient(app)

    resp = client.get("/dataset_splits/eval/top_words?indices=1&indices=2&pipeline_index=0")
    assert resp.status_code == HTTP_200_OK, resp.text
    data = resp.json()
    assert data == {
        "all": [
            {"count": 8, "word": "movie"},
            {"count": 5, "word": "humor"},
            {"count": 5, "word": "film"},
            {"count": 3, "word": "music"},
            {"count": 3, "word": "production"},
            {"count": 3, "word": "look"},
            {"count": 3, "word": "comedy"},
            {"count": 3, "word": "high"},
            {"count": 3, "word": "sense"},
            {"count": 2, "word": "affecting"},
        ],
        "errors": [
            {"count": 7, "word": "movie"},
            {"count": 5, "word": "film"},
            {"count": 3, "word": "music"},
            {"count": 3, "word": "production"},
            {"count": 3, "word": "humor"},
            {"count": 3, "word": "comedy"},
            {"count": 3, "word": "high"},
            {"count": 3, "word": "sense"},
            {"count": 2, "word": "affecting"},
            {"count": 2, "word": "slow"},
        ],
        "importanceCriteria": "frequent",
        "right": [
            {"count": 2, "word": "even"},
            {"count": 2, "word": "humor"},
            {"count": 1, "word": "root"},
            {"count": 1, "word": "clara"},
            {"count": 1, "word": "paul"},
            {"count": 1, "word": "like"},
            {"count": 1, "word": "though"},
            {"count": 1, "word": "perhaps"},
            {"count": 1, "word": "emotion"},
            {"count": 1, "word": "closer"},
        ],
    }


def test_top_words_no_result(app: FastAPI) -> None:
    client = TestClient(app)

    resp = client.get("/dataset_splits/eval/top_words?pipeline_index=0&utterance=no_result")
    assert resp.status_code == HTTP_200_OK, resp.text
    data = resp.json()
    assert data == {
        "all": [],
        "errors": [],
        "right": [],
        "importanceCriteria": "frequent",
    }
