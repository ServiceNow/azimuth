# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
import json
import time

import pytest
from fastapi import FastAPI
from starlette.testclient import TestClient

import azimuth.app as me_app
from azimuth.app import get_ready_flag
from azimuth.config import AzimuthConfig
from tests.conftest import DATASET_CFG, SIMPLE_PERTURBATION_TESTING_CONFIG


def mock_ready_flag_false():
    class MockedEvent:
        def is_set(self):
            return False

    return MockedEvent()


def create_test_app(config) -> FastAPI:
    json.dump(config.dict(by_alias=True), open("/tmp/config.json", "w"))
    return me_app.create_app_with("/tmp/config.json", debug=False, profile=False)


FAST_TEST_CFG = {
    "model": {
        "class_name": "tests.test_loading_resources.config_structured_output",
        "kwargs": {"num_classes": 2, "threshold": 0.4},
    },
    "postprocessors": None,
}


@pytest.fixture
def wait_for_startup_after(app):
    yield
    client = TestClient(app)
    resp = client.get("/status")
    while resp.json()["startupTasksReady"] is not True:
        time.sleep(1)
        resp = client.get("/status")
    task_manager = me_app.get_task_manager()
    while task_manager.is_locked:
        time.sleep(1)


@pytest.fixture(scope="session")
def app(tmpdir_factory) -> FastAPI:
    router_config = AzimuthConfig(
        name="sentiment-analysis",
        dataset=DATASET_CFG,
        pipelines=[FAST_TEST_CFG],
        artifact_path=str(tmpdir_factory.mktemp("app")),
        batch_size=16,
        use_cuda=False,
        model_contract="custom_text_classification",
        saliency_layer="distilbert.embeddings.word_embeddings",
        rejection_class=None,
        behavioral_testing=SIMPLE_PERTURBATION_TESTING_CONFIG,
    )
    _app = create_test_app(router_config)
    # Wait for app to be ready
    client = TestClient(_app)
    resp = client.get("/status")
    while resp.json()["startupTasksReady"] is not True:
        time.sleep(1)
        resp = client.get("/status")
    task_manager = me_app.get_task_manager()

    while task_manager.is_locked:
        time.sleep(1)
    yield _app


@pytest.fixture(scope="function")
def app_not_started(app) -> FastAPI:
    startup_tasks = me_app.get_startup_tasks()

    class ModuleThatWillNeverEnd:
        def status(self):
            return "pending"

        def done(self):
            return False

    # Replace real tasks by fake tasks
    _real_task = {k: v for k, v in startup_tasks.items()}
    _real_event = get_ready_flag()

    for name in startup_tasks:
        startup_tasks[name] = ModuleThatWillNeverEnd()
    app.dependency_overrides[get_ready_flag] = mock_ready_flag_false

    yield app

    # Replace to the original values.
    for name in startup_tasks:
        startup_tasks[name] = _real_task[name]
    app.dependency_overrides[get_ready_flag] = lambda: _real_event
