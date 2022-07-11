# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from fastapi import FastAPI
from starlette.status import HTTP_200_OK, HTTP_422_UNPROCESSABLE_ENTITY
from starlette.testclient import TestClient


def test_get_confidence_histogram_wrong_dataset(app: FastAPI) -> None:
    client = TestClient(app)

    invalid_dataset_split_name = "potato"
    resp = client.get(f"/dataset_splits/{invalid_dataset_split_name}/confidence_histogram")
    # TODO by default fastapi raises 422 for invalid split name but surely it should be 404?
    assert resp.status_code == HTTP_422_UNPROCESSABLE_ENTITY, resp.text


def test_get_confidence_histogram(app: FastAPI) -> None:
    client = TestClient(app)

    resp = client.get("/dataset_splits/eval/confidence_histogram?bins=0&bins=1&pipelineIndex=0")
    assert resp.status_code == HTTP_200_OK, resp.text
    data = resp.json()

    assert data == {
        "bins": [
            {
                "binConfidence": 0.025,
                "binIndex": 0,
                "meanBinConfidence": 0.0,
                "outcomeCount": {
                    "CorrectAndPredicted": 0,
                    "CorrectAndRejected": 0,
                    "IncorrectAndPredicted": 0,
                    "IncorrectAndRejected": 0,
                },
            },
            {
                "binConfidence": 0.07500000000000001,
                "binIndex": 1,
                "meanBinConfidence": 0.0,
                "outcomeCount": {
                    "CorrectAndPredicted": 0,
                    "CorrectAndRejected": 0,
                    "IncorrectAndPredicted": 0,
                    "IncorrectAndRejected": 0,
                },
            },
            {
                "binConfidence": 0.125,
                "binIndex": 2,
                "meanBinConfidence": 0.0,
                "outcomeCount": {
                    "CorrectAndPredicted": 0,
                    "CorrectAndRejected": 0,
                    "IncorrectAndPredicted": 0,
                    "IncorrectAndRejected": 0,
                },
            },
            {
                "binConfidence": 0.17500000000000002,
                "binIndex": 3,
                "meanBinConfidence": 0.0,
                "outcomeCount": {
                    "CorrectAndPredicted": 0,
                    "CorrectAndRejected": 0,
                    "IncorrectAndPredicted": 0,
                    "IncorrectAndRejected": 0,
                },
            },
            {
                "binConfidence": 0.225,
                "binIndex": 4,
                "meanBinConfidence": 0.0,
                "outcomeCount": {
                    "CorrectAndPredicted": 0,
                    "CorrectAndRejected": 0,
                    "IncorrectAndPredicted": 0,
                    "IncorrectAndRejected": 0,
                },
            },
            {
                "binConfidence": 0.275,
                "binIndex": 5,
                "meanBinConfidence": 0.0,
                "outcomeCount": {
                    "CorrectAndPredicted": 0,
                    "CorrectAndRejected": 0,
                    "IncorrectAndPredicted": 0,
                    "IncorrectAndRejected": 0,
                },
            },
            {
                "binConfidence": 0.32500000000000007,
                "binIndex": 6,
                "meanBinConfidence": 0.0,
                "outcomeCount": {
                    "CorrectAndPredicted": 0,
                    "CorrectAndRejected": 0,
                    "IncorrectAndPredicted": 0,
                    "IncorrectAndRejected": 0,
                },
            },
            {
                "binConfidence": 0.37500000000000006,
                "binIndex": 7,
                "meanBinConfidence": 0.0,
                "outcomeCount": {
                    "CorrectAndPredicted": 0,
                    "CorrectAndRejected": 0,
                    "IncorrectAndPredicted": 0,
                    "IncorrectAndRejected": 0,
                },
            },
            {
                "binConfidence": 0.42500000000000004,
                "binIndex": 8,
                "meanBinConfidence": 0.0,
                "outcomeCount": {
                    "CorrectAndPredicted": 0,
                    "CorrectAndRejected": 0,
                    "IncorrectAndPredicted": 0,
                    "IncorrectAndRejected": 0,
                },
            },
            {
                "binConfidence": 0.47500000000000003,
                "binIndex": 9,
                "meanBinConfidence": 0.0,
                "outcomeCount": {
                    "CorrectAndPredicted": 0,
                    "CorrectAndRejected": 0,
                    "IncorrectAndPredicted": 0,
                    "IncorrectAndRejected": 0,
                },
            },
            {
                "binConfidence": 0.525,
                "binIndex": 10,
                "meanBinConfidence": 0.5304411773021637,
                "outcomeCount": {
                    "CorrectAndPredicted": 0,
                    "CorrectAndRejected": 0,
                    "IncorrectAndPredicted": 0,
                    "IncorrectAndRejected": 22,
                },
            },
            {
                "binConfidence": 0.5750000000000001,
                "binIndex": 11,
                "meanBinConfidence": 0.5642743974538343,
                "outcomeCount": {
                    "CorrectAndPredicted": 0,
                    "CorrectAndRejected": 0,
                    "IncorrectAndPredicted": 3,
                    "IncorrectAndRejected": 0,
                },
            },
            {
                "binConfidence": 0.6250000000000001,
                "binIndex": 12,
                "meanBinConfidence": 0.6288018955444876,
                "outcomeCount": {
                    "CorrectAndPredicted": 1,
                    "CorrectAndRejected": 0,
                    "IncorrectAndPredicted": 0,
                    "IncorrectAndRejected": 12,
                },
            },
            {
                "binConfidence": 0.675,
                "binIndex": 13,
                "meanBinConfidence": 0.6812974707353887,
                "outcomeCount": {
                    "CorrectAndPredicted": 1,
                    "CorrectAndRejected": 0,
                    "IncorrectAndPredicted": 1,
                    "IncorrectAndRejected": 1,
                },
            },
            {
                "binConfidence": 0.7250000000000001,
                "binIndex": 14,
                "meanBinConfidence": 0.0,
                "outcomeCount": {
                    "CorrectAndPredicted": 0,
                    "CorrectAndRejected": 0,
                    "IncorrectAndPredicted": 0,
                    "IncorrectAndRejected": 0,
                },
            },
            {
                "binConfidence": 0.775,
                "binIndex": 15,
                "meanBinConfidence": 0.7535185332847896,
                "outcomeCount": {
                    "CorrectAndPredicted": 1,
                    "CorrectAndRejected": 0,
                    "IncorrectAndPredicted": 0,
                    "IncorrectAndRejected": 0,
                },
            },
            {
                "binConfidence": 0.8250000000000001,
                "binIndex": 16,
                "meanBinConfidence": 0.0,
                "outcomeCount": {
                    "CorrectAndPredicted": 0,
                    "CorrectAndRejected": 0,
                    "IncorrectAndPredicted": 0,
                    "IncorrectAndRejected": 0,
                },
            },
            {
                "binConfidence": 0.8750000000000001,
                "binIndex": 17,
                "meanBinConfidence": 0.0,
                "outcomeCount": {
                    "CorrectAndPredicted": 0,
                    "CorrectAndRejected": 0,
                    "IncorrectAndPredicted": 0,
                    "IncorrectAndRejected": 0,
                },
            },
            {
                "binConfidence": 0.925,
                "binIndex": 18,
                "meanBinConfidence": 0.0,
                "outcomeCount": {
                    "CorrectAndPredicted": 0,
                    "CorrectAndRejected": 0,
                    "IncorrectAndPredicted": 0,
                    "IncorrectAndRejected": 0,
                },
            },
            {
                "binConfidence": 0.9750000000000001,
                "binIndex": 19,
                "meanBinConfidence": 0.0,
                "outcomeCount": {
                    "CorrectAndPredicted": 0,
                    "CorrectAndRejected": 0,
                    "IncorrectAndPredicted": 0,
                    "IncorrectAndRejected": 0,
                },
            },
        ],
        "confidenceThreshold": None,
    }
