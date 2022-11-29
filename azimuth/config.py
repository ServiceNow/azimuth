# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import argparse
import os
from os.path import join as pjoin
from typing import Any, Dict, List, Literal, Optional, TypeVar, Union

import structlog
from pydantic import BaseModel, BaseSettings, Extra, Field, root_validator, validator

from azimuth.types import SupportedModelContract
from azimuth.utils.conversion import md5_hash

log = structlog.get_logger(__file__)
T = TypeVar("T", bound="ProjectConfig")

REQUIRED_EXT = {"csv", "json"}


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("config_path", default="/config/config.json")
    parser.add_argument("--port", default=8091, help="Port to serve the API.")
    parser.add_argument("--debug", action="store_true")
    return parser.parse_args()


class AzimuthValidationError(Exception):
    pass


# Mypy does not like a variable named kwargs.
class CustomObject(BaseModel):  # type: ignore
    class_name: str = Field(..., title="Class name to load.")
    args: List[Union["CustomObject", Any]] = []
    kwargs: Dict[str, Union["CustomObject", Any]] = {}
    remote: Optional[str] = Field(
        None,
        description="Relative path to class." " `class` needs to be accessible from this path.",
    )


CustomObject.update_forward_refs()


class MetricDefinition(CustomObject):  # type: ignore
    additional_kwargs: Dict = Field(
        default_factory=dict,
        title="Additional kwargs",
        description="Keyword arguments supplied to `compute`.",
    )


class TemperatureScaling(CustomObject, BaseSettings):
    class_name: Literal[
        "azimuth.utils.ml.postprocessing.TemperatureScaling"
    ] = "azimuth.utils.ml.postprocessing.TemperatureScaling"
    temperature: float = Field(1, env="TEMP")

    @root_validator()
    def check_temps(cls, values):
        kwargs = values.get("kwargs", {})
        if "temperature" not in kwargs:
            kwargs["temperature"] = values.get("temperature", 1)
            values["kwargs"] = kwargs

        return values


class ThresholdConfig(BaseSettings, CustomObject):
    class_name: Literal[
        "azimuth.utils.ml.postprocessing.Thresholding"
    ] = "azimuth.utils.ml.postprocessing.Thresholding"
    threshold: float = Field(0.5, env="TH")

    @root_validator()
    def check_threshold(cls, values):
        kwargs = values.get("kwargs", {})
        if "threshold" not in kwargs:
            kwargs["threshold"] = values.get("threshold", 0.5)
            values["kwargs"] = kwargs
        return values


class PipelineDefinition(BaseSettings):
    name: str
    model: CustomObject
    postprocessors: Optional[
        List[Union[TemperatureScaling, ThresholdConfig, CustomObject]]
    ] = Field([ThresholdConfig(threshold=0.5)], nullable=True)

    @property
    def threshold(self) -> Optional[float]:
        if self.postprocessors is None:
            return None
        thresholding = next(
            iter([post for post in self.postprocessors if isinstance(post, ThresholdConfig)]), None
        )
        if thresholding:
            return thresholding.threshold
        return None

    @property
    def temperature(self) -> Optional[float]:
        if self.postprocessors is None:
            return None
        temp_scaling = next(
            iter([post for post in self.postprocessors if isinstance(post, TemperatureScaling)]),
            None,
        )
        if temp_scaling:
            return temp_scaling.temperature
        return None


class DatasetWarningsOptions(BaseModel):
    min_num_per_class: int = 20
    max_delta_class_imbalance: float = 0.5
    max_delta_representation: float = 0.05
    max_delta_mean_tokens: float = 3.0
    max_delta_std_tokens: float = 3.0


class SyntaxOptions(BaseModel):
    short_sentence_max_token: int = 3
    long_sentence_min_token: int = 16


class NeutralTokenOptions(BaseModel):
    threshold: float = 1
    suffix_list: List[str] = ["pls", "please", "thank you", "appreciated"]
    prefix_list: List[str] = ["pls", "please", "hello", "greetings"]


class PunctuationTestOptions(BaseModel):
    threshold: float = 1


class FuzzyMatchingTestOptions(BaseModel):
    threshold: float = 1


class TypoTestOptions(BaseModel):
    threshold: float = 1
    # Ex: if nb_typos_per_utterance = 2, this will create both tests with 1 typo and 2 typos per
    # utterance.
    nb_typos_per_utterance: int = 1


class BehavioralTestingOptions(BaseModel):
    neutral_token: NeutralTokenOptions = NeutralTokenOptions()
    punctuation: PunctuationTestOptions = PunctuationTestOptions()
    fuzzy_matching: FuzzyMatchingTestOptions = FuzzyMatchingTestOptions()
    typo: TypoTestOptions = TypoTestOptions()

    # should be accessible via UI
    seed: int = 300


class SimilarityOptions(BaseModel):
    faiss_encoder: str = "all-MiniLM-L12-v2"
    # Threshold to use when finding conflicting neighbors.
    conflicting_neighbors_threshold: float = 0.9
    # Threshold to determine whether there are close neighbors.
    no_close_threshold: float = 0.5


class UncertaintyOptions(BaseModel):
    iterations: int = 1  # Number of MC sampling to do. 1 disables BMA.
    high_epistemic_threshold: float = 0.1  # Threshold to determine high epistemic items.


class ColumnConfiguration(BaseModel):
    # Column for the preprocessed text input
    text_input: str = "utterance"
    # Column for the raw text input
    raw_text_input: str = "utterance_raw"
    # Features column for the label
    label: str = "label"
    # Optional column to specify whether an example has failed preprocessing.
    failed_parsing_reason: str = "failed_parsing_reason"
    # Unique identifier for every example
    persistent_id: str = "row_idx"


class ProjectConfig(BaseSettings):
    # Name of the current project.
    name: str = Field("New project", env="NAME")
    # Dataset object definition.
    dataset: CustomObject
    # Which model_contract the application is using.
    model_contract: SupportedModelContract = SupportedModelContract.hf_text_classification
    # Column names config in dataset
    columns: ColumnConfiguration = ColumnConfiguration()
    # Name of the rejection class.
    rejection_class: Optional[str] = "REJECTION_CLASS"

    def copy(self: T, *, validate: bool = True, **kwargs: Any) -> T:
        copy: T = super().copy(**kwargs)
        if validate:
            return self.validate(
                dict(copy._iter(to_dict=False, by_alias=False, exclude_unset=True))
            )
        return copy

    def to_hash(self):
        return md5_hash(self.dict(include=ProjectConfig.__fields__.keys(), by_alias=True))


class CommonFieldsConfig(ProjectConfig, extra=Extra.ignore):
    """Fields that can be modified without affecting caching."""

    # Where to store artifacts. (HDF5 files,  HF datasets, Dask config)
    artifact_path: str = "/cache"
    # Batch size to use during inference.
    batch_size: int = 32
    # Will use CUDA and will need GPUs if set to True.
    # If "auto" we check if CUDA is available.
    use_cuda: Union[Literal["auto"], bool] = "auto"
    # Memory of the dask cluster. Regular is 6GB, Large is 12GB.
    # For bigger models, large might be needed.
    large_dask_cluster: bool = False
    # Disable configuration changes
    read_only_config: bool = Field(False, env="READ_ONLY_CONFIG")

    def get_artifact_path(self) -> str:
        """Generate a path for caching.

        The path contains the project name, the task and a subset of a hash of the project config.
        Additional fields in the config won't result in a different hash.

        Returns:
            Path to a folder where it is safe to store data.
        """
        md5 = md5_hash(
            ProjectConfig(
                **self.dict(include=ProjectConfig.__fields__.keys(), by_alias=True)
            ).dict()
        )
        path = pjoin(self.artifact_path, f"{self.name}_{self.model_contract}_{md5[:5]}")
        os.makedirs(path, exist_ok=True)
        return path


class ModelContractConfig(CommonFieldsConfig):
    # Model object definition.
    pipelines: Optional[List[PipelineDefinition]] = None
    # Uncertainty configuration
    uncertainty: UncertaintyOptions = UncertaintyOptions()
    # Layer name where to calculate the gradients, normally the word embeddings layer.
    saliency_layer: Optional[str] = None
    # Custom HuggingFace metrics
    metrics: Dict[str, MetricDefinition] = {
        "Accuracy": MetricDefinition(
            class_name="datasets.load_metric", kwargs={"path": "accuracy"}
        ),
        "Precision": MetricDefinition(
            class_name="datasets.load_metric",
            kwargs={"path": "precision"},
            additional_kwargs={"average": "weighted"},
        ),
        "Recall": MetricDefinition(
            class_name="datasets.load_metric",
            kwargs={"path": "recall"},
            additional_kwargs={"average": "weighted"},
        ),
        "F1": MetricDefinition(
            class_name="datasets.load_metric",
            kwargs={"path": "f1"},
            additional_kwargs={"average": "weighted"},
        ),
    }

    @validator("pipelines", pre=True)
    def check_pipeline_names(cls, pipeline_definitions):
        if pipeline_definitions is None:
            return pipeline_definitions
        pipeline_definitions = [
            pipeline_def.dict() if isinstance(pipeline_def, PipelineDefinition) else pipeline_def
            for pipeline_def in pipeline_definitions
        ]
        for pipeline_idx, pipeline_def in enumerate(pipeline_definitions):
            if "name" not in pipeline_def or pipeline_def["name"] == "":
                # Default value is the project name + idx.
                pipeline_def["name"] = f"Pipeline_{pipeline_idx}"
        pipeline_names = set(pipeline_def["name"] for pipeline_def in pipeline_definitions)
        if len(pipeline_definitions) != len(pipeline_names):
            raise ValueError(f"Duplicated pipeline names {pipeline_names}.")
        return pipeline_definitions


class PerturbationTestingConfig(ModelContractConfig):
    # Perturbation Testing configuration to define which test and with which params to run.
    behavioral_testing: Optional[BehavioralTestingOptions] = Field(
        BehavioralTestingOptions(), env="BEHAVIORAL_TESTING"
    )


class SimilarityConfig(CommonFieldsConfig):
    # Similarity configuration to define the encoder and the similarity threshold.
    similarity: Optional[SimilarityOptions] = Field(SimilarityOptions(), env="SIMILARITY")


class DatasetWarningConfig(CommonFieldsConfig):
    # Dataset warnings configuration to change thresholds that trigger warnings
    dataset_warnings: DatasetWarningsOptions = DatasetWarningsOptions()


class SyntaxConfig(CommonFieldsConfig):
    # Syntax configuration to change thresholds that determine short and long sentences.
    syntax: SyntaxOptions = SyntaxOptions()


class AzimuthConfig(
    PerturbationTestingConfig,
    SimilarityConfig,
    DatasetWarningConfig,
    SyntaxConfig,
    extra=Extra.forbid,
):
    # This class should remain empty!
    pass


def load_azimuth_config(config_path: str) -> AzimuthConfig:
    """
    Load the configuration from a file or make a pre-built one from a folder.

    Args:
        config_path: Path to a json file or a directory with the prediction files.

    Returns:
        The loaded config.

    Raises:
        If the file does not exist or the prediction file are not present.
    """
    log.info("-------------Loading Config--------------")
    if not os.path.isfile(config_path):
        raise EnvironmentError(f"{config_path} does not exists!")

    cfg = AzimuthConfig.parse_file(config_path)

    log.info(f"Config loaded for {cfg.name} with {cfg.model_contract} as a model contract.")

    remote_mention = "" if not cfg.dataset.remote else f"from {cfg.dataset.remote} "
    log.info(
        f"Dataset will be loaded with {cfg.dataset.class_name} "
        + remote_mention
        + f"with the following args and kwargs: {cfg.dataset.args} {cfg.dataset.kwargs}."
    )
    if cfg.pipelines:
        for pipeline_idx, pipeline in enumerate(cfg.pipelines):
            remote_pipeline = cfg.pipelines[pipeline_idx].model.remote
            remote_mention = "" if not remote_pipeline else f"from {remote_pipeline} "
            log.info(
                f"Pipeline {pipeline_idx} "
                f"will be loaded with {cfg.pipelines[pipeline_idx].model.class_name} "
                + remote_mention
                + f"with the following args: {cfg.pipelines[pipeline_idx].model.kwargs}. "
                f"Processors are set to {cfg.pipelines[pipeline_idx].postprocessors}."
            )

    not_default_config_values = cfg.dict(
        exclude_defaults=True, exclude={"name", "model_contract", "dataset", "pipelines"}
    )
    log.info(f"The following additional fields were set: {not_default_config_values}")
    log.info("-------------Config loaded--------------")

    return cfg
