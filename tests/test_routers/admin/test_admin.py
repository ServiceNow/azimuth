from fastapi import FastAPI
from starlette.testclient import TestClient


def test_get_config(app: FastAPI):
    client = TestClient(app)
    res = client.get("/admin/config").json()

    assert res == {
        "artifact_path": "/tmp/azimuth_test_cache",
        "batch_size": 16,
        "columns": {
            "failed_parsing_reason": "failed_parsing_reason",
            "label": "label",
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
            "max_delta_mean_tokens": 3.0,
            "max_delta_representation": 0.05,
            "max_delta_std_tokens": 3.0,
            "min_num_per_class": 20,
        },
        "metrics": {
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
        "behavioral_testing": {
            "fuzzy_matching": {"threshold": 1.0},
            "neutral_token": {
                "prefix_list": ["pls", "please", "hello", "greetings"],
                "suffix_list": ["pls", "please", "thank you", "appreciated"],
                "threshold": 1.0,
            },
            "punctuation": {"threshold": 1.0},
            "seed": 300,
            "typo": {"nb_typos_per_utterance": 1, "threshold": 0.005},
        },
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
        "saliency_layer": "distilbert.embeddings.word_embeddings",
        "similarity": {
            "faiss_encoder": "all-MiniLM-L12-v2",
            "few_similar_threshold": 0.9,
            "no_close_threshold": 0.5,
        },
        "uncertainty": {"high_epistemic_threshold": 0.1, "iterations": 1},
        "use_cuda": False,
    }


def test_update_config(app: FastAPI, wait_for_startup_after):
    client = TestClient(app)
    initial_config = client.get("/admin/config").json()
    initial_contract = initial_config["model_contract"]
    initial_pipelines = initial_config["pipelines"]
    res = client.patch(
        "/admin/config",
        json={"model_contract": "file_based_text_classification", "pipelines": None},
    )
    assert res.json()["model_contract"] == "file_based_text_classification"

    res = client.patch("/admin/config", json={"model_contract": "potato"})
    assert res.status_code == 400

    # Revert config change
    _ = client.patch(
        "/admin/config", json={"model_contract": initial_contract, "pipelines": initial_pipelines}
    )
