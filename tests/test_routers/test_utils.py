# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from fastapi import FastAPI
from starlette.status import HTTP_200_OK, HTTP_503_SERVICE_UNAVAILABLE
from starlette.testclient import TestClient


def test_blocked_state(app_not_started: FastAPI) -> None:
    client = TestClient(app_not_started)
    # Can reach status
    resp = client.get("/status")
    assert resp.status_code == HTTP_200_OK, resp.text

    # Can't start a task
    resp = client.get("/dataset_warnings")
    assert resp.status_code == HTTP_503_SERVICE_UNAVAILABLE, resp.text
