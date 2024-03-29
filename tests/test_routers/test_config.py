import os.path

from fastapi import FastAPI
from starlette.status import (
    HTTP_200_OK,
    HTTP_400_BAD_REQUEST,
    HTTP_403_FORBIDDEN,
    HTTP_500_INTERNAL_SERVER_ERROR,
)
from starlette.testclient import TestClient

from azimuth.config import SupportedLanguage, config_defaults_per_language
from azimuth.types import SupportedModelContract
from tests.utils import get_enum_validation_error_msg, is_sorted


def test_get_default_config(app: FastAPI):
    client = TestClient(app)
    res = client.get("/config/default").json()

    assert res == {
        "name": "New project",
        "dataset": {"class_name": "", "args": [], "kwargs": {}, "remote": None},
        "model_contract": "hf_text_classification",
        "columns": {
            "text_input": "utterance",
            "raw_text_input": "utterance_raw",
            "label": "label",
            "failed_parsing_reason": "failed_parsing_reason",
            "persistent_id": "row_idx",
        },
        "rejection_class": "REJECTION_CLASS",
        "artifact_path": os.path.abspath("cache"),
        "batch_size": 32,
        "use_cuda": "auto",
        "large_dask_cluster": False,
        "read_only_config": False,
        "language": "en",
        "syntax": {
            "short_utterance_max_word": 3,
            "long_utterance_min_word": 12,
            "spacy_model": "en_core_web_sm",
            "subj_tags": ["nsubj", "nsubjpass"],
            "obj_tags": ["dobj", "pobj", "obj"],
        },
        "dataset_warnings": {
            "min_num_per_class": 20,
            "max_delta_class_imbalance": 0.5,
            "max_delta_representation": 0.05,
            "max_delta_mean_words": 3.0,
            "max_delta_std_words": 3.0,
        },
        "similarity": {
            "faiss_encoder": "all-MiniLM-L12-v2",
            "conflicting_neighbors_threshold": 0.9,
            "no_close_threshold": 0.5,
        },
        "pipelines": [
            {
                "name": "Pipeline_0",
                "model": {"class_name": "", "args": [], "kwargs": {}, "remote": None},
                "postprocessors": [
                    {
                        "class_name": "azimuth.utils.ml.postprocessing.Thresholding",
                        "args": [],
                        "kwargs": {"threshold": 0.5},
                        "remote": None,
                        "threshold": 0.5,
                    }
                ],
            }
        ],
        "uncertainty": {"iterations": 1, "high_epistemic_threshold": 0.1},
        "saliency_layer": "auto",
        "behavioral_testing": {
            "neutral_token": {
                "threshold": 1.0,
                "suffix_list": ["pls", "please", "thank you", "appreciated"],
                "prefix_list": ["pls", "please", "hello", "greetings"],
            },
            "punctuation": {"threshold": 1.0},
            "fuzzy_matching": {"threshold": 1.0},
            "typo": {"threshold": 1.0, "nb_typos_per_utterance": 1},
            "seed": 300,
        },
        "metrics": {
            "Accuracy": {
                "class_name": "datasets.load_metric",
                "args": [],
                "kwargs": {"path": "accuracy"},
                "remote": None,
                "additional_kwargs": {},
            },
            "Precision": {
                "class_name": "datasets.load_metric",
                "args": [],
                "kwargs": {"path": "precision"},
                "remote": None,
                "additional_kwargs": {"average": "weighted"},
            },
            "Recall": {
                "class_name": "datasets.load_metric",
                "args": [],
                "kwargs": {"path": "recall"},
                "remote": None,
                "additional_kwargs": {"average": "weighted"},
            },
            "F1": {
                "class_name": "datasets.load_metric",
                "args": [],
                "kwargs": {"path": "f1"},
                "remote": None,
                "additional_kwargs": {"average": "weighted"},
            },
        },
    }


def test_get_default_config_french(app: FastAPI):
    client = TestClient(app)
    res = client.get("/config/default?language=fr").json()

    defaults = config_defaults_per_language[SupportedLanguage.fr]
    assert res["language"] == "fr"
    assert res["behavioral_testing"]["neutral_token"]["prefix_list"] == defaults.prefix_list
    assert res["behavioral_testing"]["neutral_token"]["suffix_list"] == defaults.suffix_list
    assert res["syntax"]["spacy_model"] == defaults.spacy_model
    assert res["syntax"]["subj_tags"] == defaults.subj_tags
    assert res["syntax"]["obj_tags"] == defaults.obj_tags
    assert res["similarity"]["faiss_encoder"] == defaults.faiss_encoder


def test_get_config_history(app: FastAPI):
    client = TestClient(app)
    resp = client.get("/config/history")
    assert resp.status_code == HTTP_200_OK, resp.text

    history = resp.json()
    assert len(history) >= 1
    assert is_sorted([item["created_on"] for item in history])
    # The hash has 128 bits and is represented as a string of hex characters (4 bits each).
    assert all(len(item["hash"]) == 128 / 4 for item in history)


def test_get_config(app: FastAPI):
    client = TestClient(app)
    res = client.get("/config").json()

    assert res == {
        "artifact_path": "/tmp/azimuth_test_cache",
        "batch_size": 16,
        "behavioral_testing": {
            "fuzzy_matching": {"threshold": 1.0},
            "neutral_token": {
                "prefix_list": ["pls", "hello"],
                "suffix_list": ["pls", "thanks"],
                "threshold": 1.0,
            },
            "punctuation": {"threshold": 1.0},
            "seed": 300,
            "typo": {"nb_typos_per_utterance": 1, "threshold": 0.005},
        },
        "columns": {
            "failed_parsing_reason": "failed_parsing_reason",
            "label": "label",
            "persistent_id": "row_idx",
            "raw_text_input": "utterance_raw",
            "text_input": "utterance",
        },
        "dataset": {
            "args": [],
            "class_name": "tests.test_loading_resources.load_sst2_dataset",
            "kwargs": {},
            "remote": None,
        },
        "dataset_warnings": {
            "max_delta_mean_words": 3.0,
            "max_delta_representation": 0.05,
            "max_delta_std_words": 3.0,
            "min_num_per_class": 20,
            "max_delta_class_imbalance": 0.5,
        },
        "language": "en",
        "large_dask_cluster": False,
        "metrics": {
            "Accuracy": {
                "additional_kwargs": {},
                "args": [],
                "class_name": "datasets.load_metric",
                "kwargs": {"path": "accuracy"},
                "remote": None,
            },
            "F1": {
                "additional_kwargs": {"average": "weighted"},
                "args": [],
                "class_name": "datasets.load_metric",
                "kwargs": {"path": "f1"},
                "remote": None,
            },
            "Precision": {
                "additional_kwargs": {"average": "weighted"},
                "args": [],
                "class_name": "datasets.load_metric",
                "kwargs": {"path": "precision"},
                "remote": None,
            },
            "Recall": {
                "additional_kwargs": {"average": "weighted"},
                "args": [],
                "class_name": "datasets.load_metric",
                "kwargs": {"path": "recall"},
                "remote": None,
            },
        },
        "model_contract": "custom_text_classification",
        "name": "sentiment-analysis",
        "pipelines": [
            {
                "model": {
                    "args": [],
                    "class_name": "tests.test_loading_resources.config_structured_output",
                    "kwargs": {"num_classes": 2, "threshold": 0.4},
                    "remote": None,
                },
                "name": "Pipeline_0",
                "postprocessors": None,
            }
        ],
        "rejection_class": None,
        "saliency_layer": "auto",
        "similarity": {
            "faiss_encoder": "all-MiniLM-L12-v2",
            "conflicting_neighbors_threshold": 0.9,
            "no_close_threshold": 0.5,
        },
        "syntax": {
            "long_utterance_min_word": 12,
            "short_utterance_max_word": 3,
            "spacy_model": "en_core_web_sm",
            "subj_tags": ["nsubj", "nsubjpass"],
            "obj_tags": ["dobj", "pobj", "obj"],
        },
        "uncertainty": {"high_epistemic_threshold": 0.1, "iterations": 1},
        "use_cuda": False,
        "read_only_config": False,
    }


def test_update_config(app: FastAPI, wait_for_startup_after):
    client = TestClient(app)
    initial_config = client.get("/config").json()
    initial_config_count = len(client.get("/config/history").json())

    resp = client.patch("/config", json={"artifact_path": "something/else"})
    assert resp.status_code == HTTP_403_FORBIDDEN, resp.text

    relative_artifact_path = os.path.relpath(initial_config["artifact_path"])
    assert relative_artifact_path != initial_config["artifact_path"]
    resp = client.patch("/config", json={"artifact_path": relative_artifact_path})
    assert resp.status_code == HTTP_200_OK, resp.text
    assert resp.json() == initial_config
    new_config_count = len(client.get("/config/history").json())
    assert new_config_count == initial_config_count

    resp = client.patch(
        "/config",
        json={"model_contract": "file_based_text_classification", "pipelines": None},
    )
    assert resp.json()["model_contract"] == "file_based_text_classification"
    get_config = client.get("/config").json()
    assert get_config["model_contract"] == "file_based_text_classification"
    assert not get_config["pipelines"]
    new_config_count = len(client.get("/config/history").json())
    assert new_config_count == initial_config_count + 1

    # Config Validation Error
    resp = client.patch("/config", json={"model_contract": "potato"})
    assert resp.status_code == HTTP_400_BAD_REQUEST, resp.text
    assert resp.json()["detail"] == (
        f"AzimuthConfig['model_contract']: {get_enum_validation_error_msg(SupportedModelContract)}"
    )
    get_config = client.get("/config").json()
    assert get_config["model_contract"] == "file_based_text_classification"

    # Validation Module Error
    # TODO assert error detail
    #  Should be 400, but during tests, AzimuthValidationError gets wrapped in a MultipleExceptions

    resp = client.patch(
        "/config", json={"pipelines": [{"model": {"class_name": "", "remote": "lol"}}]}
    )
    assert resp.status_code == HTTP_500_INTERNAL_SERVER_ERROR, resp.text
    # TODO assert resp.json()["detail"] == "Can't find remote 'lol' locally or on Pypi."

    resp = client.patch("/config", json={"pipelines": [{"model": {"class_name": "potato.hair"}}]})
    assert resp.status_code == HTTP_500_INTERNAL_SERVER_ERROR, resp.text

    resp = client.patch(
        "/config",
        json={"pipelines": [{"model": {"class_name": "tests.test_loading_resources.hair"}}]},
    )
    assert resp.status_code == HTTP_500_INTERNAL_SERVER_ERROR, resp.text

    resp = client.patch(
        "/config",
        json={
            "pipelines": [
                {"model": {"class_name": "tests.test_loading_resources.load_intent_data"}}
            ]
        },
    )
    assert resp.status_code == HTTP_500_INTERNAL_SERVER_ERROR, resp.text

    get_config = client.get("/config").json()
    assert not get_config["pipelines"]

    # Empty update
    resp = client.patch("/config", json={})
    assert resp.status_code == HTTP_200_OK, resp.text
    assert get_config == client.get("/config").json()

    loaded_configs = client.get("/config/history").json()
    assert len(loaded_configs) == new_config_count, "No config should have been saved since."
    assert loaded_configs[-1]["config"]["model_contract"] == "file_based_text_classification"
    assert not loaded_configs[-1]["config"]["pipelines"]

    # Revert config change
    _ = client.patch("/config", json=initial_config)

    loaded_configs = client.get("/config/history").json()
    assert loaded_configs[-1]["config"] == loaded_configs[initial_config_count - 1]["config"]
    assert loaded_configs[-1]["hash"] == loaded_configs[initial_config_count - 1]["hash"]
