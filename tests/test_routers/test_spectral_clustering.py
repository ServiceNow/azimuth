# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from fastapi import FastAPI
from starlette.status import HTTP_200_OK
from starlette.testclient import TestClient


def test_spectral_clustering(app: FastAPI) -> None:
    client = TestClient(app)

    resp = client.get("/spectral_clustering")
    assert resp.status_code == HTTP_200_OK, resp.text
    data = resp.json()

    assert list(data.keys()) == ["data", "layout"]
