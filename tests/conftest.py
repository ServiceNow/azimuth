# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import threading
from copy import deepcopy

import pytest
from distributed import Client, LocalCluster

from azimuth.config import AzimuthConfig, SupportedLanguage
from azimuth.modules.base_classes import ArtifactManager
from azimuth.startup import START_UP_THREAD_NAME
from azimuth.task_manager import TaskManager
from azimuth.types import DatasetSplitName
from tests.utils import (
    DATASET_CFG,
    DATASET_CLINC150_CFG,
    PIPELINE_CFG,
    PIPELINE_GUSE_CFG,
    SAMPLE_INTENT_TRAIN_FILE_NO_INTENT,
    SAMPLE_PREDICTIONS_FILEPATH_TOP3,
    SIMPLE_PERTURBATION_TESTING_CONFIG,
    file_based_ds_from_paths,
    file_based_pipeline_from,
    generate_mocked_dm,
)

# General Fixtures


@pytest.fixture(autouse=True, scope="function")
def cleanup_class():
    yield
    ArtifactManager.clear_cache()


def kill_scheduler(dask_scheduler=None):
    dask_scheduler.close()


def cleanup_workers():
    import gc

    ArtifactManager.clear_cache()
    gc.collect()


@pytest.fixture()
def dask_client():
    # Reduce memory print for tests, use a different port for less warnings.
    cluster = LocalCluster(
        n_workers=2, threads_per_worker=1, dashboard_address=None, memory_limit="2GB"
    )
    client = Client(cluster)
    yield client
    client.run(cleanup_workers)
    client.run_on_scheduler(kill_scheduler)
    cluster.close()
    client.close()


@pytest.fixture
def apply_mocked_startup_task(simple_text_config):
    def fn(config):
        generate_mocked_dm(config, DatasetSplitName.eval)
        generate_mocked_dm(config, DatasetSplitName.train)

    fn(simple_text_config)
    return fn


# Sentiment Analysis Fixtures


@pytest.fixture
def simple_text_config(tmp_path):
    return AzimuthConfig(
        name="sentiment-analysis",
        dataset=DATASET_CFG,
        pipelines=[PIPELINE_CFG],
        artifact_path=str(tmp_path),
        batch_size=10,
        model_contract="hf_text_classification",
        saliency_layer="distilbert.embeddings.word_embeddings",
        rejection_class=None,
        behavioral_testing=SIMPLE_PERTURBATION_TESTING_CONFIG,
    )


@pytest.fixture
def simple_text_config_multi_pipeline(simple_text_config):
    pipeline_cfg_low = deepcopy(PIPELINE_CFG)
    pipeline_cfg_low["name"] = "Low threshold Model"
    pipeline_cfg_low["postprocessors"][-1]["threshold"] = 0.2
    pipeline_cfg_high = deepcopy(PIPELINE_CFG)
    pipeline_cfg_high["name"] = "High threshold Model"
    pipeline_cfg_high["postprocessors"][-1]["threshold"] = 0.99
    simple_multipipeline_text_config = simple_text_config.copy(
        deep=True, update=dict(pipelines=[pipeline_cfg_low, pipeline_cfg_high])
    )
    return simple_multipipeline_text_config


@pytest.fixture
def tiny_text_config(simple_text_config) -> AzimuthConfig:
    tiny_text_config = simple_text_config.copy(deep=True)
    tiny_text_config.dataset.kwargs["max_dataset_len"] = 4
    return tiny_text_config


@pytest.fixture(params=["train", "eval"])
def tiny_text_config_one_ds(tiny_text_config, request) -> AzimuthConfig:
    tiny_text_config_one_ds = tiny_text_config.copy(deep=True)
    tiny_text_config_one_ds.dataset.kwargs[request.param] = False
    return tiny_text_config_one_ds


@pytest.fixture
def tiny_text_config_no_pipeline(tiny_text_config) -> AzimuthConfig:
    tiny_text_config_no_pipeline = tiny_text_config.copy(deep=True)
    tiny_text_config_no_pipeline.pipelines = None
    return tiny_text_config_no_pipeline


@pytest.fixture
def tiny_text_task_manager(tiny_text_config, dask_client):
    task_manager = TaskManager(tiny_text_config, cluster=dask_client.cluster)

    yield task_manager

    task_manager.close()
    # Close possible dangling threads that would never complete.
    thread = threading.enumerate()
    start_up_thread = [th for th in thread if th.name == START_UP_THREAD_NAME]
    for th in start_up_thread:
        th.join()


@pytest.fixture
def simple_text_config_french(tmp_path):
    return AzimuthConfig(
        name="sentiment-analysis-french",
        dataset=DATASET_CFG,
        pipelines=[PIPELINE_CFG],
        artifact_path=str(tmp_path),
        batch_size=10,
        model_contract="hf_text_classification",
        saliency_layer="distilbert.embeddings.word_embeddings",
        rejection_class=None,
        language=SupportedLanguage.fr,
    )


# File-Based Fixtures


@pytest.fixture
def file_text_config_top1(tmp_path):
    ds_config = file_based_ds_from_paths()
    return AzimuthConfig(
        name="intent-test",
        pipelines=[{"model": file_based_pipeline_from(ds_config)}],
        dataset=ds_config,
        artifact_path=str(tmp_path),
        batch_size=10,
        rejection_class="NO_INTENT",
        model_contract="file_based_text_classification",
        behavioral_testing=SIMPLE_PERTURBATION_TESTING_CONFIG,
    )


@pytest.fixture
def file_text_config_top3(file_text_config_top1):
    ds_config = file_based_ds_from_paths(test=SAMPLE_PREDICTIONS_FILEPATH_TOP3)
    file_text_config_top3 = file_text_config_top1.copy(
        deep=True,
        update=dict(pipelines=[{"model": file_based_pipeline_from(ds_config)}], dataset=ds_config),
    )
    return file_text_config_top3


@pytest.fixture
def file_text_config_no_intent(file_text_config_top1):
    ds_config = file_based_ds_from_paths(train=SAMPLE_INTENT_TRAIN_FILE_NO_INTENT)
    file_text_config_no_intent = file_text_config_top1.copy(
        deep=True,
        update=dict(pipelines=[{"model": file_based_pipeline_from(ds_config)}], dataset=ds_config),
    )
    return file_text_config_no_intent


# Specific Dataset/Pipelines Fixtures


@pytest.fixture
def clinc_text_config(tmp_path):
    clinc_text_config = AzimuthConfig(
        name="clinc-test",
        dataset=DATASET_CLINC150_CFG,
        rejection_class="NO_INTENT",
        pipelines=[PIPELINE_CFG],
        artifact_path=str(tmp_path),
    )
    clinc_text_config.pipelines[0].postprocessors[0].temperature = 1
    clinc_text_config.pipelines[0].postprocessors[0].kwargs["temperature"] = 1
    clinc_text_config.pipelines[0].postprocessors[-1].threshold = 0.5
    clinc_text_config.pipelines[0].postprocessors[-1].kwargs["threshold"] = 0.5
    return clinc_text_config


@pytest.fixture
def guse_text_config(file_text_config_top1):
    guse_text_config = file_text_config_top1.copy(
        deep=True, update=dict(pipelines=[PIPELINE_GUSE_CFG])
    )
    guse_text_config.model_contract = "custom_text_classification"
    return guse_text_config
