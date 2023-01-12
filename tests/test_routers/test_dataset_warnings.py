# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from fastapi import FastAPI
from starlette.status import HTTP_200_OK
from starlette.testclient import TestClient


def test_dataset_warnings(app: FastAPI) -> None:
    client = TestClient(app)

    resp = client.get("/dataset_warnings")
    assert resp.status_code == HTTP_200_OK, resp.text
    data = resp.json()
    for warning_type in data:
        for warning in warning_type["warnings"]:
            warning.pop("plots")

    assert data == [
        {
            "name": "General Warnings",
            "warnings": [
                {
                    "columns": ["training", "evaluation"],
                    "comparisons": [
                        {
                            "alert": False,
                            "data": [{"alert": False, "value": 23}, {"alert": False, "value": 22}],
                            "name": "negative",
                        },
                        {
                            "alert": True,
                            "data": [{"alert": True, "value": 19}, {"alert": False, "value": 20}],
                            "name": "positive",
                        },
                    ],
                    "description": "Nb of samples per class in the training or "
                    "evaluation set is below 20.",
                    "format": "Integer",
                    "name": "Missing samples (<20)",
                },
                {
                    "columns": ["training", "evaluation"],
                    "comparisons": [
                        {
                            "alert": False,
                            "data": [
                                {"alert": False, "value": 0.09523809523809534},
                                {"alert": False, "value": 0.04761904761904767},
                            ],
                            "name": "negative",
                        },
                        {
                            "alert": False,
                            "data": [
                                {"alert": False, "value": -0.09523809523809523},
                                {"alert": False, "value": -0.04761904761904767},
                            ],
                            "name": "positive",
                        },
                    ],
                    "description": "Relative difference between the number of "
                    "samples per class and the mean in each dataset "
                    "split is above 50%.",
                    "format": "Percentage",
                    "name": "Class imbalance (>50%)",
                },
                {
                    "columns": ["abs. diff."],
                    "comparisons": [
                        {
                            "alert": False,
                            "data": [{"alert": False, "value": 0.023809523809523836}],
                            "name": "negative",
                        },
                        {
                            "alert": False,
                            "data": [{"alert": False, "value": 0.02380952380952378}],
                            "name": "positive",
                        },
                    ],
                    "description": "Absolute difference between the proportion of a given class "
                    "in the training set vs the evaluation set is "
                    "above 5%.",
                    "format": "Percentage",
                    "name": "Representation mismatch (>5%)",
                },
            ],
        },
        {
            "name": "Syntactic Warnings",
            "warnings": [
                {
                    "columns": ["mean", "std"],
                    "comparisons": [
                        {
                            "alert": True,
                            "data": [
                                {"alert": True, "value": 8.015810276679842},
                                {"alert": True, "value": 3.5906416471375184},
                            ],
                            "name": "negative",
                        },
                        {
                            "alert": True,
                            "data": [
                                {"alert": True, "value": 7.389473684210527},
                                {"alert": True, "value": 3.5437914479857975},
                            ],
                            "name": "positive",
                        },
                    ],
                    "description": "Delta between the number of words per utterance for a given "
                    "class in the evaluation set vs the train set "
                    "is above 3±3.",
                    "format": "Decimal",
                    "name": "Length mismatch (>3±3 words)",
                }
            ],
        },
    ]
