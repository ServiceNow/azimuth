# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from fastapi import FastAPI
from starlette.status import HTTP_200_OK
from starlette.testclient import TestClient


def test_generate_perturbation_tests(app: FastAPI) -> None:
    client = TestClient(app)
    resp = client.get(
        "/custom_utterances/perturbed_utterances?utterances=hello, this is me"
        + "&utterances=I like potatoes."
    )
    assert resp.status_code == HTTP_200_OK, resp.text
    assert resp.headers["content-type"] == "application/json"
    assert int(resp.headers["content-length"]) > 0
    assert "generate_perturbation_tests" in resp.headers["content-disposition"]
    assert ".json" in resp.headers["content-disposition"]
