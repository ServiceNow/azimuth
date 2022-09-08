# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from fastapi import FastAPI
from starlette.status import HTTP_200_OK
from starlette.testclient import TestClient


def test_post_tags(app: FastAPI) -> None:
    client = TestClient(app)

    request = {"data_actions": {0: {"remove": True, "NO_ACTION": False}}}
    resp = client.post("/tags", json=request)
    assert resp.status_code == HTTP_200_OK, resp.text
    data = resp.json()
    assert data == {
        "dataActions": [
            {
                "relabel": False,
                "defineNewClass": False,
                "mergeClasses": False,
                "remove": True,
                "augmentWithSimilar": False,
                "investigate": False,
            }
        ]
    }

    # Reset tag to NO_ACTION
    request = {"data_actions": {0: {"remove": False, "NO_ACTION": True}}}
    resp = client.post("/tags", json=request)
    assert resp.status_code == HTTP_200_OK, resp.text
    data = resp.json()
    assert data == {
        "dataActions": [
            {
                "relabel": False,
                "defineNewClass": False,
                "mergeClasses": False,
                "remove": False,
                "augmentWithSimilar": False,
                "investigate": False,
            }
        ]
    }
