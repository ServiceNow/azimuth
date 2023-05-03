from fastapi import FastAPI
from starlette.status import HTTP_200_OK, HTTP_400_BAD_REQUEST, HTTP_500_INTERNAL_SERVER_ERROR
from starlette.testclient import TestClient

from azimuth.config import SupportedLanguage, config_defaults_per_language
from azimuth.types import SupportedModelContract
from tests.utils import get_enum_validation_error_msg, is_sorted


def test_get_default_config(app: FastAPI):
    client = TestClient(app)
    res = client.get("/config/default").json()

    assert res == {
        "name": "New project",
        "dataset": None,
        "modelContract": "hf_text_classification",
        "columns": {
            "textInput": "utterance",
            "rawTextInput": "utterance_raw",
            "label": "label",
            "failedParsingReason": "failed_parsing_reason",
            "persistentId": "row_idx",
        },
        "rejectionClass": "REJECTION_CLASS",
        "artifactPath": "cache",
        "batchSize": 32,
        "useCuda": "auto",
        "largeDaskCluster": False,
        "readOnlyConfig": False,
        "language": "en",
        "syntax": {
            "shortUtteranceMaxWord": 3,
            "longUtteranceMinWord": 12,
            "spacyModel": "en_core_web_sm",
            "subjTags": ["nsubj", "nsubjpass"],
            "objTags": ["dobj", "pobj", "obj"],
        },
        "datasetWarnings": {
            "minNumPerClass": 20,
            "maxDeltaClassImbalance": 0.5,
            "maxDeltaRepresentation": 0.05,
            "maxDeltaMeanWords": 3.0,
            "maxDeltaStdWords": 3.0,
        },
        "similarity": {
            "faissEncoder": "all-MiniLM-L12-v2",
            "conflictingNeighborsThreshold": 0.9,
            "noCloseThreshold": 0.5,
        },
        "pipelines": [
            {
                "name": "required",
                "model": {"className": "required", "args": [], "kwargs": {}, "remote": None},
                "postprocessors": [
                    {
                        "className": "azimuth.utils.ml.postprocessing.Thresholding",
                        "args": [],
                        "kwargs": {"threshold": 0.5},
                        "remote": None,
                        "threshold": 0.5,
                    }
                ],
            }
        ],
        "uncertainty": {"iterations": 1, "highEpistemicThreshold": 0.1},
        "saliencyLayer": None,
        "behavioralTesting": {
            "neutralToken": {
                "threshold": 1.0,
                "suffixList": ["pls", "please", "thank you", "appreciated"],
                "prefixList": ["pls", "please", "hello", "greetings"],
            },
            "punctuation": {"threshold": 1.0},
            "fuzzyMatching": {"threshold": 1.0},
            "typo": {"threshold": 1.0, "nbTyposPerUtterance": 1},
            "seed": 300,
        },
        "metrics": {
            "Accuracy": {
                "className": "datasets.load_metric",
                "args": [],
                "kwargs": {"path": "accuracy"},
                "remote": None,
                "additionalKwargs": {},
            },
            "Precision": {
                "className": "datasets.load_metric",
                "args": [],
                "kwargs": {"path": "precision"},
                "remote": None,
                "additionalKwargs": {"average": "weighted"},
            },
            "Recall": {
                "className": "datasets.load_metric",
                "args": [],
                "kwargs": {"path": "recall"},
                "remote": None,
                "additionalKwargs": {"average": "weighted"},
            },
            "F1": {
                "className": "datasets.load_metric",
                "args": [],
                "kwargs": {"path": "f1"},
                "remote": None,
                "additionalKwargs": {"average": "weighted"},
            },
        },
    }


def test_get_default_config_french(app: FastAPI):
    client = TestClient(app)
    res = client.get("/config/default?language=fr").json()

    defaults = config_defaults_per_language[SupportedLanguage.fr]
    assert res["language"] == "fr"
    assert res["behavioralTesting"]["neutralToken"]["prefixList"] == defaults.prefix_list
    assert res["behavioralTesting"]["neutralToken"]["suffixList"] == defaults.suffix_list
    assert res["syntax"]["spacyModel"] == defaults.spacy_model
    assert res["syntax"]["subjTags"] == defaults.subj_tags
    assert res["syntax"]["objTags"] == defaults.obj_tags
    assert res["similarity"]["faissEncoder"] == defaults.faiss_encoder


def test_get_config_history(app: FastAPI):
    client = TestClient(app)
    resp = client.get("/config/history")
    assert resp.status_code == HTTP_200_OK, resp.text

    history = resp.json()
    assert len(history) >= 1
    assert is_sorted([item["createdOn"] for item in history])
    # The hash has 128 bits and is represented as a string of hex characters (4 bits each).
    assert all(len(item["hash"]) == 128 / 4 for item in history)


def test_get_config(app: FastAPI):
    client = TestClient(app)
    res = client.get("/config").json()

    assert res == {
        "artifactPath": "/tmp/azimuth_test_cache",
        "batchSize": 16,
        "behavioralTesting": {
            "fuzzyMatching": {"threshold": 1.0},
            "neutralToken": {
                "prefixList": ["pls", "hello"],
                "suffixList": ["pls", "thanks"],
                "threshold": 1.0,
            },
            "punctuation": {"threshold": 1.0},
            "seed": 300,
            "typo": {"nbTyposPerUtterance": 1, "threshold": 0.005},
        },
        "columns": {
            "failedParsingReason": "failed_parsing_reason",
            "label": "label",
            "persistentId": "row_idx",
            "rawTextInput": "utterance_raw",
            "textInput": "utterance",
        },
        "dataset": {
            "args": [],
            "className": "tests.test_loading_resources.load_sst2_dataset",
            "kwargs": {},
            "remote": None,
        },
        "datasetWarnings": {
            "maxDeltaMeanWords": 3.0,
            "maxDeltaRepresentation": 0.05,
            "maxDeltaStdWords": 3.0,
            "minNumPerClass": 20,
            "maxDeltaClassImbalance": 0.5,
        },
        "language": "en",
        "largeDaskCluster": False,
        "metrics": {
            "Accuracy": {
                "additionalKwargs": {},
                "args": [],
                "className": "datasets.load_metric",
                "kwargs": {"path": "accuracy"},
                "remote": None,
            },
            "F1": {
                "additionalKwargs": {"average": "weighted"},
                "args": [],
                "className": "datasets.load_metric",
                "kwargs": {"path": "f1"},
                "remote": None,
            },
            "Precision": {
                "additionalKwargs": {"average": "weighted"},
                "args": [],
                "className": "datasets.load_metric",
                "kwargs": {"path": "precision"},
                "remote": None,
            },
            "Recall": {
                "additionalKwargs": {"average": "weighted"},
                "args": [],
                "className": "datasets.load_metric",
                "kwargs": {"path": "recall"},
                "remote": None,
            },
        },
        "modelContract": "custom_text_classification",
        "name": "sentiment-analysis",
        "pipelines": [
            {
                "model": {
                    "args": [],
                    "className": "tests.test_loading_resources.config_structured_output",
                    "kwargs": {"num_classes": 2, "threshold": 0.4},
                    "remote": None,
                },
                "name": "Pipeline_0",
                "postprocessors": None,
            }
        ],
        "rejectionClass": None,
        "saliencyLayer": "distilbert.embeddings.word_embeddings",
        "similarity": {
            "faissEncoder": "all-MiniLM-L12-v2",
            "conflictingNeighborsThreshold": 0.9,
            "noCloseThreshold": 0.5,
        },
        "syntax": {
            "longUtteranceMinWord": 12,
            "shortUtteranceMaxWord": 3,
            "spacyModel": "en_core_web_sm",
            "subjTags": ["nsubj", "nsubjpass"],
            "objTags": ["dobj", "pobj", "obj"],
        },
        "uncertainty": {"highEpistemicThreshold": 0.1, "iterations": 1},
        "useCuda": False,
        "readOnlyConfig": False,
    }


def test_update_config(app: FastAPI, wait_for_startup_after):
    client = TestClient(app)
    initial_config = client.get("/config").json()
    initial_contract = initial_config["modelContract"]
    initial_pipelines = initial_config["pipelines"]
    initial_config_count = len(client.get("/config/history").json())

    resp = client.patch(
        "/config",
        # TODO camelCase
        json={"modelContract": "file_based_text_classification", "pipelines": None},
    )
    assert resp.json().get("modelContract") == "file_based_text_classification", resp.json()
    get_config = client.get("/config").json()
    assert get_config["modelContract"] == "file_based_text_classification"
    assert not get_config["pipelines"]
    new_config_count = len(client.get("/config/history").json())
    assert new_config_count == initial_config_count + 1

    # Config Validation Error
    resp = client.patch("/config", json={"modelContract": "potato"})
    assert resp.status_code == HTTP_400_BAD_REQUEST, resp.text
    assert resp.json()["detail"] == (
        f"AzimuthConfig['modelContract']: {get_enum_validation_error_msg(SupportedModelContract)}"
    )
    get_config = client.get("/config").json()
    assert get_config["modelContract"] == "file_based_text_classification"

    # Validation Module Error
    resp = client.patch(
        "/config",
        json={
            "pipelines": [{"model": {"className": "tests.test_loading_resources.load_intent_data"}}]
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
    assert loaded_configs[-1]["config"]["modelContract"] == "file_based_text_classification"
    assert not loaded_configs[-1]["config"]["pipelines"]

    # Revert config change
    _ = client.patch(
        "/config", json={"modelContract": initial_contract, "pipelines": initial_pipelines}
    )

    loaded_configs = client.get("/config/history").json()
    assert loaded_configs[-1]["config"] == loaded_configs[initial_config_count - 1]["config"]
    assert loaded_configs[-1]["hash"] == loaded_configs[initial_config_count - 1]["hash"]
