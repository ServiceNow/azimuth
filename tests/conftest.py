# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import random
import threading
from copy import deepcopy
from pathlib import Path

import numpy as np
import pytest
from distributed import Client, LocalCluster

from azimuth.config import (
    AzimuthConfig,
    BehavioralTestingOptions,
    NeutralTokenOptions,
    PipelineDefinition,
    TypoTestOptions,
)
from azimuth.dataset_split_manager import DatasetSplitManager, PredictionTableKey
from azimuth.modules.base_classes import ArtifactManager
from azimuth.modules.task_mapping import model_contract_methods, modules
from azimuth.startup import START_UP_THREAD_NAME
from azimuth.task_manager import TaskManager
from azimuth.types import DatasetColumn, DatasetSplitName
from azimuth.types.outcomes import OutcomeName
from azimuth.types.tag import (
    ALL_DATA_ACTIONS,
    ALL_PREDICTION_TAGS,
    ALL_SMART_TAGS,
    ALL_STANDARD_TAGS,
)
from azimuth.utils.project import (
    load_dataset_from_config,
    load_dataset_split_managers_from_config,
)
from tests.test_loading_resources import load_sst2_dataset

SIMPLE_PERTURBATION_TESTING_CONFIG = BehavioralTestingOptions(
    neutral_suffix=NeutralTokenOptions(suffix_list=["pls", "thanks"], prefix_list=["pls", "hello"]),
    typo=TypoTestOptions(threshold=0.005),
)


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


_AZ_ROOT = Path(__file__).parents[1].resolve()
_CURRENT_DIR = Path(__file__).parent.resolve()
_SAMPLE_DATA_DIR = _CURRENT_DIR / "fixtures"
_SAMPLE_VOCAB_DIR = _SAMPLE_DATA_DIR / "distilbert-tokenizer-files"

CHECKPOINT_PATH = str(_SAMPLE_VOCAB_DIR)
MODEL_CFG = {
    "model": {
        "class_name": "tests.test_loading_resources.load_hf_text_classif_pipeline",
        "kwargs": {"checkpoint_path": CHECKPOINT_PATH},
    },
}

HIGH_THRESHOLD_MODEL = {
    "model": {
        "class_name": "tests.test_loading_resources.load_hf_text_classif_pipeline",
        "kwargs": {"checkpoint_path": CHECKPOINT_PATH},
    },
    "postprocessors": [{"threshold": 0.99}],
}
DATASET_CFG = {
    "class_name": "tests.test_loading_resources.load_sst2_dataset",
    "kwargs": {},
}

TINY_DATASET_CFG = {
    "class_name": "tests.test_loading_resources.load_sst2_dataset",
    "kwargs": {"max_dataset_len": 2},
}


@pytest.fixture
def simple_text_config(tmp_path):
    return AzimuthConfig(
        name="sentiment-analysis",
        dataset=DATASET_CFG,
        pipelines=[PipelineDefinition(**MODEL_CFG)],
        artifact_path=str(tmp_path),
        batch_size=10,
        use_cuda="auto",
        model_contract="hf_text_classification",
        saliency_layer="distilbert.embeddings.word_embeddings",
        rejection_class=None,
        behavioral_testing=SIMPLE_PERTURBATION_TESTING_CONFIG,
    )


@pytest.fixture
def simple_multipipeline_text_config(tmp_path):
    return AzimuthConfig(
        name="sentiment-analysis",
        dataset=DATASET_CFG,
        pipelines=[PipelineDefinition(**MODEL_CFG), PipelineDefinition(**HIGH_THRESHOLD_MODEL)],
        artifact_path=str(tmp_path),
        batch_size=10,
        use_cuda="auto",
        model_contract="hf_text_classification",
        saliency_layer="distilbert.embeddings.word_embeddings",
        rejection_class=None,
        behavioral_testing=SIMPLE_PERTURBATION_TESTING_CONFIG,
    )


@pytest.fixture
def simple_no_pipeline_text_config(tmp_path):
    return AzimuthConfig(
        name="sentiment-analysis",
        dataset=DATASET_CFG,
        pipelines=None,
        artifact_path=str(tmp_path),
        batch_size=10,
        use_cuda="auto",
        model_contract="hf_text_classification",
        saliency_layer="distilbert.embeddings.word_embeddings",
        rejection_class=None,
        behavioral_testing=SIMPLE_PERTURBATION_TESTING_CONFIG,
    )


@pytest.fixture
def simple_table_key(simple_text_config):
    return PredictionTableKey.from_pipeline_index(
        0,
        simple_text_config,
    )


@pytest.fixture
def clinc_table_key(text_config_CLINC150):
    return PredictionTableKey.from_pipeline_index(
        0,
        text_config_CLINC150,
    )


@pytest.fixture
def simple_text_config_high_threshold(tmp_path):
    # We set the threshold very high because our test model has random weights
    return AzimuthConfig(
        name="sentiment-analysis",
        dataset=DATASET_CFG,
        pipelines=[HIGH_THRESHOLD_MODEL],
        artifact_path=str(tmp_path),
        batch_size=10,
        model_contract="hf_text_classification",
        use_cuda="auto",
        saliency_layer="distilbert.embeddings.word_embeddings",
        rejection_class=None,
        behavioral_testing=SIMPLE_PERTURBATION_TESTING_CONFIG,
    )


@pytest.fixture
def simple_text_config_no_train(tmp_path):
    config = deepcopy(DATASET_CFG)
    config["kwargs"]["train"] = False
    return AzimuthConfig(
        name="sentiment-analysis",
        dataset=config,
        pipelines=[MODEL_CFG],
        artifact_path=str(tmp_path),
        batch_size=10,
        use_cuda="auto",
        rejection_class=None,
        model_contract="hf_text_classification",
        saliency_layer="distilbert.embeddings.word_embeddings",
        behavioral_testing=SIMPLE_PERTURBATION_TESTING_CONFIG,
    )


@pytest.fixture
def tiny_text_config(tmp_path):
    return AzimuthConfig(
        name="sentiment-analysis",
        dataset=TINY_DATASET_CFG,
        pipelines=[MODEL_CFG],
        artifact_path=str(tmp_path),
        batch_size=10,
        use_cuda="auto",
        model_contract="hf_text_classification",
        saliency_layer="distilbert.embeddings.word_embeddings",
        rejection_class=None,
        behavioral_testing=SIMPLE_PERTURBATION_TESTING_CONFIG,
    )


@pytest.fixture
def a_text_dataset():
    return load_sst2_dataset()["validation"]


@pytest.fixture
def text_dm_with_tags(simple_text_config):
    ds = load_dataset_from_config(simple_text_config)[DatasetSplitName.eval]
    # Some prediction
    ds = ds.map(
        lambda x, i: {
            DatasetColumn.model_predictions: [i % 2],
            DatasetColumn.model_confidences: [i / len(ds)],
            DatasetColumn.postprocessed_confidences: [i / len(ds)],
            DatasetColumn.confidence_bin_idx: np.random.randint(1, 20),
        },
        with_indices=True,
    )

    def compute_outcome(prediction, label):
        if prediction == label:
            if prediction > simple_text_config.pipelines[0].threshold:
                return OutcomeName.CorrectAndPredicted
            else:
                return OutcomeName.CorrectAndRejected
        elif prediction <= simple_text_config.pipelines[0].threshold:
            return OutcomeName.IncorrectAndRejected
        else:
            return OutcomeName.IncorrectAndPredicted

    ds = ds.map(
        lambda x: {
            DatasetColumn.postprocessed_prediction: x[DatasetColumn.model_predictions][0]
            if x[DatasetColumn.postprocessed_confidences][0]
            > simple_text_config.pipelines[0].threshold
            else -1,
            DatasetColumn.outcome: compute_outcome(
                x[DatasetColumn.postprocessed_confidences][0], x["label"]
            ),
        }
    )
    ds = ds.map(
        lambda x: {
            DatasetColumn.neighbors_train: [
                [np.random.randint(1, 1000), np.random.rand()] for i in range(0, 20)
            ],
            DatasetColumn.neighbors_eval: [
                [np.random.randint(1, 1000), np.random.rand()] for i in range(0, 20)
            ],
        }
    )

    dm = DatasetSplitManager(
        DatasetSplitName.eval,
        simple_text_config,
        initial_tags=ALL_STANDARD_TAGS,
        initial_prediction_tags=ALL_PREDICTION_TAGS,
        dataset_split=ds,
    )
    add_every_tag_once(dm)
    yield dm


def add_every_tag_once(dm):
    # Tags some utterances
    for idx, t in enumerate(ALL_DATA_ACTIONS):
        tags = {idx: {t: True}}
        dm.add_tags(
            tags,
            PredictionTableKey.from_pipeline_index(
                0,
                dm.config,
            ),
        )
    # Tags some utterances
    for idx, t in enumerate(ALL_SMART_TAGS):
        tags = {idx: {t: True}}
        dm.add_tags(
            tags,
            PredictionTableKey.from_pipeline_index(
                0,
                dm.config,
            ),
        )


@pytest.fixture
def text_task_manager(simple_text_config, dask_client):
    task_manager = TaskManager(simple_text_config, cluster=dask_client.cluster)
    for task_type in [model_contract_methods, modules]:
        for k, v in task_type.items():
            task_manager.register_task(k, v)

    yield task_manager

    task_manager.close()
    # Close possible dangling threads that would never complete.
    thread = threading.enumerate()
    start_up_thread = [th for th in thread if th.name == START_UP_THREAD_NAME]
    for th in start_up_thread:
        th.join()


@pytest.fixture
def text_task_manager_high_threshold(simple_text_config_high_threshold, dask_client):
    task_manager = TaskManager(simple_text_config_high_threshold, cluster=dask_client.cluster)
    for task_type in [model_contract_methods, modules]:
        for k, v in task_type.items():
            task_manager.register_task(k, v)

    yield task_manager

    task_manager.close()
    thread = threading.enumerate()
    start_up_thread = [th for th in thread if th.name == START_UP_THREAD_NAME]
    for th in start_up_thread:
        th.join()


@pytest.fixture
def simple_text_config_cuda(tmp_path):
    return AzimuthConfig(
        name="sentiment-analysis",
        dataset=DATASET_CFG,
        pipelines=[MODEL_CFG],
        artifact_path=str(tmp_path),
        batch_size=10,
        use_cuda="auto",
        rejection_class=None,
        model_contract="hf_text_classification",
        saliency_layer="distilbert.embeddings.word_embeddings",
        behavioral_testing=SIMPLE_PERTURBATION_TESTING_CONFIG,
    )


@pytest.fixture
def apply_mocked_startup_task(simple_text_config):
    def fn(config):
        faiss_features = lambda: np.random.randn(786)
        columns = [
            (DatasetColumn.model_predictions, lambda: np.random.randint(0, 2, size=2).tolist()),
            (DatasetColumn.postprocessed_prediction, lambda: np.random.randint(0, 2)),
            (DatasetColumn.model_confidences, lambda: [0.4, 0.6]),
            (DatasetColumn.postprocessed_confidences, lambda: [0.4, 0.6]),
            (DatasetColumn.token_count, lambda: np.random.randint(5, 12)),
            (DatasetColumn.outcome, lambda: random.choice([r for r in OutcomeName])),
        ]
        dms = load_dataset_split_managers_from_config(config)
        for dm in dms.values():
            row = dm.num_rows
            [dm.add_column(name, [fn() for _ in range(row)]) for name, fn in columns]
            add_every_tag_once(dm)
            dm.add_faiss_index([faiss_features() for _ in range(row)])

    fn(simple_text_config)
    return fn


_SAMPLE_INTENT_DIR = _SAMPLE_DATA_DIR / "intent"
_SAMPLE_INTENT_TRAIN_FILE = str(_SAMPLE_INTENT_DIR / "sample_train_file.csv")
_SAMPLE_INTENT_TRAIN_FILE_WNOINTENT = str(_SAMPLE_INTENT_DIR / "sample_train_file_wnointent.csv")
_SAMPLE_PREDICTIONS_FILEPATH_TOP3 = str(_SAMPLE_INTENT_DIR / "sample_predictions_top3.csv")
_SAMPLE_PREDICTIONS_FILEPATH_TOP1 = str(_SAMPLE_INTENT_DIR / "sample_predictions_top1.csv")

_SAMPLE_CLINC150 = str(_SAMPLE_DATA_DIR / "sample_CLINC150.json")

DATASET_INTENT_TOP3_CFG = {
    "class_name": "tests.test_loading_resources.load_file_dataset",
    "args": ["csv"],
    "kwargs": {
        "data_files": {
            "train": _SAMPLE_INTENT_TRAIN_FILE,
            "test": _SAMPLE_PREDICTIONS_FILEPATH_TOP3,
        },
    },
}

DATASET_INTENT_TOP1_CFG = {
    "class_name": "tests.test_loading_resources.load_file_dataset",
    "args": ["csv"],
    "kwargs": {
        "data_files": {
            "train": _SAMPLE_INTENT_TRAIN_FILE,
            "test": _SAMPLE_PREDICTIONS_FILEPATH_TOP1,
        },
    },
}

DATASET_NOINTENT_CFG = {
    "class_name": "tests.test_loading_resources.load_file_dataset",
    "args": ["csv"],
    "kwargs": {
        "data_files": {
            "train": _SAMPLE_INTENT_TRAIN_FILE_WNOINTENT,
            "test": _SAMPLE_PREDICTIONS_FILEPATH_TOP1,
        },
    },
}

DATASET_CLINC150_CFG = {
    "class_name": "tests.test_loading_resources.load_CLINC150_data",
    "kwargs": {
        "python_loader": str(_AZ_ROOT / "azimuth_shr/data/CLINC150.py"),
        "full_path": _SAMPLE_CLINC150,
    },
}


def file_based_model_from(ds_config):
    return {
        "class_name": "models.file_based.FileBasedModel",
        "remote": str(_AZ_ROOT / "azimuth_shr"),
        "kwargs": {
            "test_path": ds_config["kwargs"]["data_files"]["test"],
        },
    }


@pytest.fixture
def file_text_config_top3(tmp_path):
    return AzimuthConfig(
        name="intent-test",
        pipelines=[{"model": file_based_model_from(DATASET_INTENT_TOP3_CFG)}],
        dataset=DATASET_INTENT_TOP3_CFG,
        artifact_path=str(tmp_path),
        batch_size=3,
        use_cuda="auto",
        rejection_class="NO_INTENT",
        model_contract="file_based_text_classification",
        behavioral_testing=SIMPLE_PERTURBATION_TESTING_CONFIG,
    )


@pytest.fixture
def file_text_config_top1(tmp_path):
    return AzimuthConfig(
        name="intent-test",
        pipelines=[{"model": file_based_model_from(DATASET_INTENT_TOP1_CFG)}],
        dataset=DATASET_INTENT_TOP1_CFG,
        artifact_path=str(tmp_path),
        batch_size=3,
        use_cuda="auto",
        rejection_class="NO_INTENT",
        model_contract="file_based_text_classification",
        behavioral_testing=SIMPLE_PERTURBATION_TESTING_CONFIG,
    )


@pytest.fixture
def file_text_config_no_intent(tmp_path):
    return AzimuthConfig(
        name="intent-test",
        dataset=DATASET_NOINTENT_CFG,
        pipelines=[{"model": file_based_model_from(DATASET_NOINTENT_CFG)}],
        artifact_path=str(tmp_path),
        batch_size=3,
        use_cuda="auto",
        rejection_class="NO_INTENT",
        model_contract="file_based_text_classification",
        behavioral_testing=SIMPLE_PERTURBATION_TESTING_CONFIG,
    )


@pytest.fixture
def text_config_CLINC150(tmp_path):
    return AzimuthConfig(
        name="intent-test",
        dataset=DATASET_CLINC150_CFG,
        pipelines=[MODEL_CFG],
        artifact_path=str(tmp_path),
        batch_size=3,
        use_cuda="auto",
        rejection_class="NO_INTENT",
        model_contract="hf_text_classification",
        behavioral_testing=SIMPLE_PERTURBATION_TESTING_CONFIG,
    )


MODEL_GUSE_CFG = {
    "model": {
        "class_name": "tests.test_loading_resources.load_tf_model",
        "kwargs": {"checkpoint_path": CHECKPOINT_PATH},
    }
}


@pytest.fixture
def guse_text_config(tmp_path):
    return AzimuthConfig(
        name="intent-test",
        dataset=DATASET_INTENT_TOP1_CFG,
        pipelines=[MODEL_GUSE_CFG],
        artifact_path=str(tmp_path),
        batch_size=3,
        use_cuda="auto",
        rejection_class="NO_INTENT",
        model_contract="custom_text_classification",
        behavioral_testing=SIMPLE_PERTURBATION_TESTING_CONFIG,
    )
