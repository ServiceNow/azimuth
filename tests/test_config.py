import os
from datetime import datetime
from glob import glob
from os.path import join as pjoin

import pytest
from jsonlines import jsonlines
from pydantic import ValidationError

from azimuth.config import (
    AzimuthConfig,
    PipelineDefinition,
    SupportedLanguage,
    TemperatureScaling,
    ThresholdConfig,
    config_defaults_per_language,
    load_azimuth_config,
)
from azimuth.utils.project import save_config, update_config

CURR_PATH = os.path.dirname(os.path.dirname(__file__))


def test_loading_config():
    config_search = pjoin(CURR_PATH, "config/**/*.json")
    all_configs = glob(config_search, recursive=True)
    assert len(all_configs) > 0, f"No config found using {config_search}!"

    exceptions = []
    for c in all_configs:
        try:
            AzimuthConfig.parse_file(c)
        except Exception as e:
            exceptions.append({"file": c, "exceptions": e})
    if exceptions:
        raise RuntimeError(f"Found the following errors: {exceptions}")


def test_config_shortcut():
    mod = PipelineDefinition(
        name="MyPotato",
        model={"class_name": "potato"},
        postprocessors=[{"temperature": 2}, {"threshold": 0.4}],
    )
    assert isinstance(mod.postprocessors[0], TemperatureScaling)
    assert isinstance(mod.postprocessors[1], ThresholdConfig)

    mod = PipelineDefinition(
        name="MyPotato",
        model={"class_name": "potato"},
        postprocessors=[
            {
                "class_name": "my_cool_postpro",
            },
            {"threshold": 0.4},
        ],
    )
    assert not isinstance(mod.postprocessors[0], TemperatureScaling)
    assert isinstance(mod.postprocessors[1], ThresholdConfig)


MINIMAL_CONFIG = {
    "model_contract": "hf_text_classification",
    "dataset": {"class_name": "potato"},
}


def test_pipeline_names():
    # Happy path, no name anywhere
    cfg = AzimuthConfig(
        **MINIMAL_CONFIG,
        pipelines=[
            {"model": {"class_name": "model1"}},
            {"model": {"class_name": "model2"}},
        ],
    )
    names = [pipeline.name for pipeline in cfg.pipelines]
    assert names == ["Pipeline_0", "Pipeline_1"]

    # One pipeline is named
    cfg = AzimuthConfig(
        **MINIMAL_CONFIG,
        pipelines=[
            {"name": "PotatoPipeline", "model": {"class_name": "model1"}},
            {"model": {"class_name": "model2"}},
        ],
    )
    names = [pipeline.name for pipeline in cfg.pipelines]
    assert names == ["PotatoPipeline", "Pipeline_1"]

    # Test duplicates
    with pytest.raises(ValidationError):
        cfg = AzimuthConfig(
            **MINIMAL_CONFIG,
            pipelines=[
                {"name": "PotatoPipeline", "model": {"class_name": "model1"}},
                {"name": "PotatoPipeline", "model": {"class_name": "model2"}},
            ],
            name="SuperProject",
        )

    # More duplicates
    with pytest.raises(ValidationError):
        cfg = AzimuthConfig(
            **MINIMAL_CONFIG,
            pipelines=[
                {"name": "Pipeline_1", "model": {"class_name": "model1"}},
                {"model": {"class_name": "model2"}},
            ],
        )


def test_french_defaults_and_override():
    subj_tags_potatoes = ["russet", "yukon_gold"]
    cfg = AzimuthConfig(
        **MINIMAL_CONFIG,
        language="fr",
        syntax={"subj_tags": subj_tags_potatoes},
    )
    assert (
        cfg.syntax.subj_tags == subj_tags_potatoes
    ), "Config did not take user-provided values for subj_tags"
    assert (
        cfg.syntax.spacy_model == config_defaults_per_language[SupportedLanguage.fr].spacy_model
    ), "Config did not take default French value for spacy_model"
    assert (
        cfg.syntax.obj_tags == config_defaults_per_language[SupportedLanguage.fr].obj_tags
    ), "Config did not take default French value for spacy_model"
    assert (
        cfg.similarity.faiss_encoder
        == config_defaults_per_language[SupportedLanguage.fr].faiss_encoder
    ), "Config did not take default French value for faiss encoder"
    assert (
        cfg.behavioral_testing.neutral_token.suffix_list
        == config_defaults_per_language[SupportedLanguage.fr].suffix_list
    ), "Config did not take default French value for suffix list (neutral tokens)"
    assert (
        cfg.behavioral_testing.neutral_token.prefix_list
        == config_defaults_per_language[SupportedLanguage.fr].prefix_list
    ), "Config did not take default French value for prefix list (neutral tokens)"


def test_config_min_max_values():
    AzimuthConfig(
        **MINIMAL_CONFIG,
        pipelines=[{"model": {"class_name": "Cls"}, "postprocessors": [{"temperature": 0}]}],
    )
    with pytest.raises(ValidationError):
        AzimuthConfig(
            **MINIMAL_CONFIG,
            pipelines=[{"model": {"class_name": "Cls"}, "postprocessors": [{"temperature": -0.1}]}],
        )

    AzimuthConfig(
        **MINIMAL_CONFIG,
        pipelines=[{"model": {"class_name": "Cls"}, "postprocessors": [{"threshold": 0}]}],
    )
    AzimuthConfig(
        **MINIMAL_CONFIG,
        pipelines=[{"model": {"class_name": "Cls"}, "postprocessors": [{"threshold": 1}]}],
    )
    with pytest.raises(ValidationError):
        AzimuthConfig(
            **MINIMAL_CONFIG,
            pipelines=[{"model": {"class_name": "Cls"}, "postprocessors": [{"threshold": -0.1}]}],
        )
    with pytest.raises(ValidationError):
        AzimuthConfig(
            **MINIMAL_CONFIG,
            pipelines=[{"model": {"class_name": "Cls"}, "postprocessors": [{"threshold": 1.1}]}],
        )

    AzimuthConfig(**MINIMAL_CONFIG, dataset_warnings={"min_num_per_class": 1})
    with pytest.raises(ValidationError):
        AzimuthConfig(**MINIMAL_CONFIG, dataset_warnings={"min_num_per_class": 0})

    AzimuthConfig(**MINIMAL_CONFIG, dataset_warnings={"max_delta_class_imbalance": 0})
    AzimuthConfig(**MINIMAL_CONFIG, dataset_warnings={"max_delta_class_imbalance": 1})
    with pytest.raises(ValidationError):
        AzimuthConfig(**MINIMAL_CONFIG, dataset_warnings={"max_delta_class_imbalance": -0.1})
    with pytest.raises(ValidationError):
        AzimuthConfig(**MINIMAL_CONFIG, dataset_warnings={"max_delta_class_imbalance": 1.1})

    AzimuthConfig(**MINIMAL_CONFIG, dataset_warnings={"max_delta_representation": 0})
    AzimuthConfig(**MINIMAL_CONFIG, dataset_warnings={"max_delta_representation": 1})
    with pytest.raises(ValidationError):
        AzimuthConfig(**MINIMAL_CONFIG, dataset_warnings={"max_delta_representation": -0.1})
    with pytest.raises(ValidationError):
        AzimuthConfig(**MINIMAL_CONFIG, dataset_warnings={"max_delta_representation": 1.1})

    AzimuthConfig(**MINIMAL_CONFIG, dataset_warnings={"max_delta_mean_words": 0})
    with pytest.raises(ValidationError):
        AzimuthConfig(**MINIMAL_CONFIG, dataset_warnings={"max_delta_mean_words": -0.1})

    AzimuthConfig(**MINIMAL_CONFIG, dataset_warnings={"max_delta_std_words": 0})
    with pytest.raises(ValidationError):
        AzimuthConfig(**MINIMAL_CONFIG, dataset_warnings={"max_delta_std_words": -0.1})

    AzimuthConfig(**MINIMAL_CONFIG, syntax={"short_utterance_max_word": 1})
    with pytest.raises(ValidationError):
        AzimuthConfig(**MINIMAL_CONFIG, syntax={"short_utterance_max_word": 0})

    AzimuthConfig(**MINIMAL_CONFIG, syntax={"long_utterance_min_word": 1})
    with pytest.raises(ValidationError):
        AzimuthConfig(**MINIMAL_CONFIG, syntax={"long_utterance_min_word": 0})

    AzimuthConfig(**MINIMAL_CONFIG, similarity={"conflicting_neighbors_threshold": 0})
    AzimuthConfig(**MINIMAL_CONFIG, similarity={"conflicting_neighbors_threshold": 1})
    with pytest.raises(ValidationError):
        AzimuthConfig(**MINIMAL_CONFIG, similarity={"conflicting_neighbors_threshold": -0.1})
    with pytest.raises(ValidationError):
        AzimuthConfig(**MINIMAL_CONFIG, similarity={"conflicting_neighbors_threshold": 1.1})

    AzimuthConfig(**MINIMAL_CONFIG, similarity={"no_close_threshold": -1})
    AzimuthConfig(**MINIMAL_CONFIG, similarity={"no_close_threshold": 1})
    with pytest.raises(ValidationError):
        AzimuthConfig(**MINIMAL_CONFIG, similarity={"no_close_threshold": -1.1})
    with pytest.raises(ValidationError):
        AzimuthConfig(**MINIMAL_CONFIG, similarity={"no_close_threshold": 1.1})

    AzimuthConfig(**MINIMAL_CONFIG, uncertainty={"iterations": 1})
    with pytest.raises(ValidationError):
        AzimuthConfig(**MINIMAL_CONFIG, uncertainty={"iterations": 0})

    AzimuthConfig(**MINIMAL_CONFIG, uncertainty={"high_epistemic_threshold": 0})
    with pytest.raises(ValidationError):
        AzimuthConfig(**MINIMAL_CONFIG, uncertainty={"high_epistemic_threshold": -0.1})


def test_update_config(tiny_text_config, monkeypatch, dask_client):
    config_history_path = tiny_text_config.get_config_history_path()

    # Changing config for a first time
    partial_config = {"similarity": None}
    new_config = update_config(tiny_text_config, partial_config)
    assert not new_config.similarity
    save_config(new_config)

    with jsonlines.open(config_history_path, "r") as reader:
        all_configs = list(reader)
    assert len(all_configs) == 1
    assert all_configs[0]["config"] == new_config

    # Changing config for a second time
    partial_config = {"dataset_warnings": {"min_num_per_class": 40}}
    new_config = update_config(new_config, partial_config)
    assert new_config.dataset_warnings.min_num_per_class == 40
    save_config(new_config)

    with jsonlines.open(config_history_path, "r") as reader:
        all_configs = list(reader)

    assert len(all_configs) == 2
    assert all_configs[-1]["config"] == new_config

    assert datetime.fromisoformat(all_configs[-1]["created_on"]) > datetime.fromisoformat(
        all_configs[0]["created_on"]
    ), "Second config should be created on after the first one."


def test_load_from_config_history(tiny_text_config):
    # With no config history, the loaded config is the default, not the tiny_text_config.
    cfg = load_azimuth_config(config_path=None, load_config_history=False)
    assert cfg == AzimuthConfig()

    # With a config history, the loaded config is the last one from the config history.
    save_config(tiny_text_config)
    os.environ["ARTIFACT_PATH"] = tiny_text_config.artifact_path
    cfg = load_azimuth_config(config_path=None, load_config_history=True)
    assert cfg == tiny_text_config
    del os.environ["ARTIFACT_PATH"]
    assert cfg.is_last_in_config_history()
