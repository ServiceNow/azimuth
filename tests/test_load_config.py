import os
from glob import glob
from os.path import join as pjoin

import pytest
from pydantic import ValidationError

from azimuth.config import (
    AzimuthConfig,
    PipelineDefinition,
    TemperatureScaling,
    ThresholdConfig,
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
