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
                                {"alert": True, "value": 12.071146245059289},
                                {"alert": True, "value": 4.469294371655238},
                            ],
                            "name": "negative",
                        },
                        {
                            "alert": True,
                            "data": [
                                {"alert": True, "value": 11.15263157894737},
                                {"alert": True, "value": 3.219210813495705},
                            ],
                            "name": "positive",
                        },
                    ],
                    "description": "Delta between the number of tokens of a given "
                    "class in the evaluation set vs the train set "
                    "is above 3±3.",
                    "format": "Decimal",
                    "name": "Length mismatch (>3±3 tokens)",
                }
            ],
        },
    ]
