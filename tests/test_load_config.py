import os
from glob import glob
from os.path import join as pjoin

import pytest
from pydantic import ValidationError

from azimuth.config import (
    AzimuthConfig,
    PipelineDefinition,
    SupportedLanguage,
    TemperatureScaling,
    ThresholdConfig,
    config_defaults_per_language,
)

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


DEFAULT_CONFIG = {
    "model_contract": "hf_text_classification",
    "dataset": {"class_name": "potato"},
}


def test_pipeline_names():
    # Happy path, no name anywhere
    cfg = AzimuthConfig(
        **{
            **DEFAULT_CONFIG,
            **{
                "pipelines": [
                    {"model": {"class_name": "model1"}},
                    {"model": {"class_name": "model2"}},
                ]
            },
        }
    )
    names = [pipeline.name for pipeline in cfg.pipelines]
    assert names == ["Pipeline_0", "Pipeline_1"]

    # One pipeline is named
    cfg = AzimuthConfig(
        **{
            **DEFAULT_CONFIG,
            **{
                "pipelines": [
                    {"name": "PotatoPipeline", "model": {"class_name": "model1"}},
                    {"model": {"class_name": "model2"}},
                ]
            },
        }
    )
    names = [pipeline.name for pipeline in cfg.pipelines]
    assert names == ["PotatoPipeline", "Pipeline_1"]

    # Test duplicates
    with pytest.raises(ValidationError):
        cfg = AzimuthConfig(
            **{
                **DEFAULT_CONFIG,
                **{
                    "pipelines": [
                        {"name": "PotatoPipeline", "model": {"class_name": "model1"}},
                        {"name": "PotatoPipeline", "model": {"class_name": "model2"}},
                    ],
                    "name": "SuperProject",
                },
            }
        )

    # More duplicates
    with pytest.raises(ValidationError):
        cfg = AzimuthConfig(
            **{
                **DEFAULT_CONFIG,
                **{
                    "pipelines": [
                        {"name": "Pipeline_1", "model": {"class_name": "model1"}},
                        {"model": {"class_name": "model2"}},
                    ],
                },
            }
        )


def test_french_defaults_and_override():
    subj_tags_potatoes = ["russet", "yukon_gold"]
    cfg = AzimuthConfig(
        **{
            **DEFAULT_CONFIG,
            **{"language": "fr", "syntax": {"subj_tags": subj_tags_potatoes}},
        }
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
