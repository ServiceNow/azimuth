# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import argparse
import os
from datetime import datetime, timezone
from enum import Enum
from os.path import join as pjoin
from typing import Any, Dict, List, Literal, Optional, TypeVar, Union

import structlog
from jsonlines import jsonlines
from pydantic import BaseSettings, Extra, Field, root_validator, validator

from azimuth.types import AliasModel, DatasetColumn, SupportedModelContract
from azimuth.utils.conversion import md5_hash
from azimuth.utils.exclude_fields_from_cache import exclude_fields_from_cache
from azimuth.utils.openapi import fix_union_types, make_all_properties_required

log = structlog.get_logger(__file__)
T = TypeVar("T", bound="ProjectConfig")

REQUIRED_EXT = {"csv", "json"}


class SupportedLanguage(str, Enum):
    en = "en"
    fr = "fr"


# spaCy models must be in pyproject.toml to be loaded by Azimuth
class SupportedSpacyModels(str, Enum):
    use_default = ""
    en_core_web_sm = "en_core_web_sm"
    fr_core_news_md = "fr_core_news_md"


# To see all dep tag options for a spacy model: spacy.load(SPACY_MODEL).get_pipe("parser").labels
class LanguageDefaultValues(AliasModel):
    suffix_list: List[str]
    prefix_list: List[str]
    spacy_model: SupportedSpacyModels
    subj_tags: List[str]
    obj_tags: List[str]
    faiss_encoder: str


config_defaults_per_language: Dict[SupportedLanguage, LanguageDefaultValues] = {
    SupportedLanguage.en: LanguageDefaultValues(
        suffix_list=["pls", "please", "thank you", "appreciated"],
        prefix_list=["pls", "please", "hello", "greetings"],
        spacy_model="en_core_web_sm",
        subj_tags=["nsubj", "nsubjpass"],
        obj_tags=["dobj", "pobj", "obj"],
        faiss_encoder="all-MiniLM-L12-v2",
    ),
    SupportedLanguage.fr: LanguageDefaultValues(
        suffix_list=["svp", "s'il vous plaît", "merci", "super"],
        prefix_list=["svp", "s'il vous plaît", "bonjour", "allô"],
        spacy_model="fr_core_news_md",
        subj_tags=["nsubj", "nsubj:pass"],
        obj_tags=["obj", "iobj", "obl:arg", "obl:agent", "obl:mod"],
        faiss_encoder="distiluse-base-multilingual-cased-v1",
    ),
}


def parse_args():
    """Parse CLI args.

    Returns: argparse Namespace
    """
    parser = argparse.ArgumentParser()
    parser.add_argument("config_path", default=None, nargs="?")
    parser.add_argument(
        "--load-config-history",
        action="store_true",
        help="Load the last config from history, or if empty, default to config_path.",
    )
    parser.add_argument("--port", default=8091, help="Port to serve the API.")
    parser.add_argument("--debug", action="store_true")
    return parser.parse_args()


class AzimuthValidationError(Exception):
    pass


class AzimuthBaseSettings(BaseSettings):
    class Config:
        @staticmethod
        def schema_extra(schema):
            fix_union_types(schema)
            make_all_properties_required(schema)


class CustomObject(AzimuthBaseSettings):
    class_name: str = Field(
        ...,
        title="Class name to load.",
        description="Name of the function or class that is located in `remote`."
        "`args` and `kwargs` will be sent to the function/class.",
    )
    args: List[Any] = []
    kwargs: Dict[str, Any] = {}
    remote: Optional[str] = Field(
        None,
        description="Absolute path to class. `class_name` needs to be accessible from this path.",
        nullable=True,
    )


CustomObject.update_forward_refs()


class MetricDefinition(CustomObject):
    additional_kwargs: Dict = Field(
        default_factory=dict,
        title="Additional kwargs",
        description="Keyword arguments supplied to `compute`.",
    )


class TemperatureScaling(CustomObject):
    class_name: Literal[
        "azimuth.utils.ml.postprocessing.TemperatureScaling"
    ] = "azimuth.utils.ml.postprocessing.TemperatureScaling"
    temperature: float = Field(1, ge=0, env="TEMP")

    @root_validator()
    def check_temps(cls, values):
        kwargs = values.get("kwargs", {})
        if "temperature" not in kwargs:
            kwargs["temperature"] = values.get("temperature", 1)
            values["kwargs"] = kwargs

        return values


class ThresholdConfig(CustomObject):
    class_name: Literal[
        "azimuth.utils.ml.postprocessing.Thresholding"
    ] = "azimuth.utils.ml.postprocessing.Thresholding"
    threshold: float = Field(0.5, ge=0, le=1, env="TH")

    @root_validator()
    def check_threshold(cls, values):
        kwargs = values.get("kwargs", {})
        if "threshold" not in kwargs:
            kwargs["threshold"] = values.get("threshold", 0.5)
            values["kwargs"] = kwargs
        return values


class PipelineDefinition(AzimuthBaseSettings):
    name: str = Field(..., exclude_from_cache=True)
    model: CustomObject
    postprocessors: Optional[
        List[Union[TemperatureScaling, ThresholdConfig, CustomObject]]
    ] = Field([ThresholdConfig(threshold=0.5)], nullable=True)

    @property
    def threshold(self) -> Optional[float]:
        if self.postprocessors is None:
            return None
        thresholding = next(
            (post for post in self.postprocessors if isinstance(post, ThresholdConfig)), None
        )
        if thresholding:
            return thresholding.threshold
        return None

    @property
    def temperature(self) -> Optional[float]:
        if self.postprocessors is None:
            return None
        temp_scaling = next(
            (post for post in self.postprocessors if isinstance(post, TemperatureScaling)), None
        )
        if temp_scaling:
            return temp_scaling.temperature
        return None


class DatasetWarningsOptions(AzimuthBaseSettings):
    min_num_per_class: int = Field(20, ge=1)
    max_delta_class_imbalance: float = Field(0.5, ge=0, le=1)
    max_delta_representation: float = Field(0.05, ge=0, le=1)
    max_delta_mean_words: float = Field(3, ge=0)
    max_delta_std_words: float = Field(3, ge=0)


class SyntaxOptions(AzimuthBaseSettings):
    short_utterance_max_word: int = Field(3, ge=1)
    long_utterance_min_word: int = Field(12, ge=1)
    spacy_model: SupportedSpacyModels = SupportedSpacyModels.use_default  # Language-based default
    subj_tags: List[str] = []  # Language-based dynamic default value
    obj_tags: List[str] = []  # Language-based dynamic default value


class NeutralTokenOptions(AzimuthBaseSettings):
    threshold: float = Field(1, ge=0, le=1)
    suffix_list: List[str] = []  # Language-based default value
    prefix_list: List[str] = []  # Language-based default value


class PunctuationTestOptions(AzimuthBaseSettings):
    threshold: float = Field(1, ge=0, le=1)


class FuzzyMatchingTestOptions(AzimuthBaseSettings):
    threshold: float = Field(1, ge=0, le=1)


class TypoTestOptions(AzimuthBaseSettings):
    threshold: float = Field(1, ge=0, le=1)
    nb_typos_per_utterance: int = Field(
        1,
        ge=1,
        description="For example, the value 2 would create both tests with 1 typo and with 2 typos "
        "per utterance.",
    )


class BehavioralTestingOptions(AzimuthBaseSettings):
    neutral_token: NeutralTokenOptions = NeutralTokenOptions()
    punctuation: PunctuationTestOptions = PunctuationTestOptions()
    fuzzy_matching: FuzzyMatchingTestOptions = FuzzyMatchingTestOptions()
    typo: TypoTestOptions = TypoTestOptions()

    # should be accessible via UI
    seed: int = 300


class SimilarityOptions(AzimuthBaseSettings):
    faiss_encoder: str = Field("", description="Language-based dynamic default value.")
    conflicting_neighbors_threshold: float = Field(
        0.9, ge=0, le=1, description="Threshold to use when finding conflicting neighbors."
    )
    no_close_threshold: float = Field(
        0.5, ge=-1, le=1, description="Threshold to determine whether there are close neighbors."
    )


class UncertaintyOptions(AzimuthBaseSettings):
    iterations: int = Field(1, ge=1, description="Number of MC sampling to do. 1 disables BMA.")
    high_epistemic_threshold: float = Field(
        0.1, ge=0, description="Threshold to determine high epistemic items."
    )


class ColumnConfiguration(AzimuthBaseSettings):
    # Column for the preprocessed text input
    text_input: str = "utterance"
    # Column for the raw text input
    raw_text_input: str = "utterance_raw"
    # Features column for the label
    label: str = "label"
    # Optional column to specify whether an example has failed preprocessing.
    failed_parsing_reason: str = "failed_parsing_reason"
    # Unique identifier for every example
    persistent_id: str = DatasetColumn.row_idx


class ProjectConfig(AzimuthBaseSettings):
    # Name of the current project.
    name: str = Field("New project", exclude_from_cache=True)
    # Dataset object definition.
    dataset: Optional[CustomObject] = None
    # Column names config in dataset
    columns: ColumnConfiguration = ColumnConfiguration()
    # Name of the rejection class.
    rejection_class: Optional[str] = Field("REJECTION_CLASS", nullable=True)

    def copy(self: T, *, validate: bool = True, **kwargs: Any) -> T:
        copy: T = super().copy(**kwargs)
        if validate:
            return self.validate(
                dict(copy._iter(to_dict=False, by_alias=False, exclude_unset=True))
            )
        return copy

    def get_project_hash(self):
        return md5_hash(
            self.dict(
                include=ProjectConfig.__fields__.keys(),
                exclude=exclude_fields_from_cache(self),
                by_alias=True,
            )
        )


class ArtifactsConfig(AzimuthBaseSettings, extra=Extra.ignore):
    artifact_path: str = Field(
        "cache",
        description="Where to store artifacts (Azimuth config history, HDF5 files, HF datasets).",
        exclude_from_cache=True,
    )

    def get_config_history_path(self):
        return f"{self.artifact_path}/config_history.jsonl"


class CommonFieldsConfig(ArtifactsConfig, ProjectConfig, extra=Extra.ignore):
    """Fields that can be modified without affecting caching."""

    # Batch size to use during inference.
    batch_size: int = Field(32, exclude_from_cache=True)
    # Will use CUDA and will need GPUs if set to True.
    # If "auto" we check if CUDA is available.
    use_cuda: Union[Literal["auto"], bool] = Field("auto", exclude_from_cache=True)
    # Memory of the dask cluster. Regular is 6GB, Large is 12GB.
    # For bigger models, large might be needed.
    large_dask_cluster: bool = Field(False, exclude_from_cache=True)
    # Disable configuration changes
    read_only_config: bool = Field(False, exclude_from_cache=True)

    def get_project_path(self) -> str:
        """Generate a path for caching.

        The path contains the project name and a subset of a hash of the project config.
        Additional fields in the config won't result in a different hash.

        Returns:
            Path to a folder where it is safe to store data.
        """
        path = pjoin(self.artifact_path, f"{self.name}_{self.get_project_hash()[:5]}")
        os.makedirs(path, exist_ok=True)
        return path


class ModelContractConfig(CommonFieldsConfig):
    # Which model_contract the application is using.
    model_contract: SupportedModelContract = SupportedModelContract.hf_text_classification
    # Model object definition.
    pipelines: Optional[List[PipelineDefinition]] = Field(None, nullable=True)
    # Uncertainty configuration
    uncertainty: UncertaintyOptions = UncertaintyOptions()
    # Layer name where to calculate the gradients, normally the word embeddings layer.
    saliency_layer: Optional[str] = Field(None, nullable=True)

    @validator("pipelines", pre=True)
    def check_pipeline_names(cls, pipeline_definitions):
        # We support both [] and None (null in JSON), and we standardize it to None.
        if not pipeline_definitions:
            return None
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


class MetricsConfig(ModelContractConfig):
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


class LanguageConfig(CommonFieldsConfig):
    # Language config sets multiple config values; see `config_defaults_per_language` for details
    # Language should only determine other config values and not be referenced in modules.
    # The default `language` environment variable was conflicting on certain machines.
    language: SupportedLanguage = Field(SupportedLanguage.en, env=[])


class PerturbationTestingConfig(ModelContractConfig):
    # Perturbation Testing configuration to define which test and with which params to run.
    behavioral_testing: Optional[BehavioralTestingOptions] = Field(
        BehavioralTestingOptions(), nullable=True
    )


class SimilarityConfig(CommonFieldsConfig):
    # Similarity configuration to define the encoder and the similarity threshold.
    similarity: Optional[SimilarityOptions] = Field(SimilarityOptions(), nullable=True)


class SyntaxConfig(CommonFieldsConfig):
    # Syntax configuration to change thresholds that determine short and long utterances.
    syntax: SyntaxOptions = SyntaxOptions()


class DatasetWarningConfig(SyntaxConfig):
    # Dataset warnings configuration to change thresholds that trigger warnings
    dataset_warnings: DatasetWarningsOptions = DatasetWarningsOptions()


class TopWordsConfig(SyntaxConfig, ModelContractConfig):
    pass


class MetricsPerFilterConfig(
    PerturbationTestingConfig, SimilarityConfig, SyntaxConfig, LanguageConfig, MetricsConfig
):
    pass


class AzimuthConfig(
    MetricsPerFilterConfig,
    TopWordsConfig,
    DatasetWarningConfig,
    extra=Extra.forbid,
):
    # Reminder: If a module depends on an attribute in AzimuthConfig, the module will be forced to
    # include all other configs in its scope.

    @root_validator()
    def dynamic_language_config_values(cls, values):
        defaults = config_defaults_per_language[values["language"]]
        if behavioral_testing := values.get("behavioral_testing"):
            neutral_token = behavioral_testing.neutral_token
            neutral_token.prefix_list = neutral_token.prefix_list or defaults.prefix_list
            neutral_token.suffix_list = neutral_token.suffix_list or defaults.suffix_list
        if syntax := values.get("syntax"):
            syntax.spacy_model = syntax.spacy_model or defaults.spacy_model
            syntax.subj_tags = syntax.subj_tags or defaults.subj_tags
            syntax.obj_tags = syntax.obj_tags or defaults.obj_tags
        if similarity := values.get("similarity"):
            similarity.faiss_encoder = similarity.faiss_encoder or defaults.faiss_encoder
        return values

    @classmethod
    def load(cls, config_path: Optional[str], load_config_history: bool) -> "AzimuthConfig":
        # Loading config from config_path if specified, or else from environment variables only.
        cfg = ArtifactsConfig.parse_file(config_path) if config_path else ArtifactsConfig()

        if load_config_history:
            config_history_path = cfg.get_config_history_path()
            last_config = cls.load_last_from_config_history(config_history_path)
            if last_config:
                log.info(f"Loading latest config from {config_history_path}.")
                return last_config

            log.info("Empty or invalid config history.")

        return cls.parse_file(config_path) if config_path else cls()

    @classmethod
    def load_last_from_config_history(cls, config_history_path: str) -> Optional["AzimuthConfig"]:
        try:
            with jsonlines.open(config_history_path, mode="r") as config_history:
                *_, last_config = config_history
        except (FileNotFoundError, ValueError):
            return None
        else:
            return AzimuthConfigHistory.parse_obj(last_config).config

    def log_info(self):
        log.info(f"Config loaded for {self.name} with {self.model_contract} as a model contract.")

        if self.dataset:
            remote_mention = "" if not self.dataset.remote else f"from {self.dataset.remote} "
            log.info(
                f"Dataset will be loaded with {self.dataset.class_name} "
                + remote_mention
                + f"with the following args and kwargs: {self.dataset.args} {self.dataset.kwargs}."
            )

        if self.pipelines:
            for pipeline_idx, pipeline in enumerate(self.pipelines):
                remote_pipeline = self.pipelines[pipeline_idx].model.remote
                remote_mention = "" if not remote_pipeline else f"from {remote_pipeline} "
                log.info(
                    f"Pipeline {pipeline_idx} "
                    f"will be loaded with {self.pipelines[pipeline_idx].model.class_name} "
                    + remote_mention
                    + f"with the following args: {self.pipelines[pipeline_idx].model.kwargs}. "
                    f"Processors are set to {self.pipelines[pipeline_idx].postprocessors}."
                )

        not_default_config_values = self.dict(
            exclude_defaults=True,
            exclude={"name", "model_contract", "dataset", "pipelines"},
            exclude_unset=True,
        )
        log.info(f"The following additional fields were set: {not_default_config_values}")

    def save(self):
        """Append config to config_history.jsonl to retrieve past configs."""
        if self == self.load_last_from_config_history(self.get_config_history_path()):
            return
        # TODO https://stackoverflow.com/questions/2333872/
        #  how-to-make-file-creation-an-atomic-operation
        with jsonlines.open(self.get_config_history_path(), mode="a") as f:
            f.write(AzimuthConfigHistory(config=self).dict())


class AzimuthConfigHistory(AzimuthBaseSettings):
    config: AzimuthConfig
    created_on: str = Field(default_factory=lambda: str(datetime.now(timezone.utc)))


def load_azimuth_config(config_path: Optional[str], load_config_history: bool) -> AzimuthConfig:
    log.info("-------------Loading Config--------------")
    cfg = AzimuthConfig.load(config_path, load_config_history)
    cfg.log_info()
    log.info("-------------Config loaded--------------")

    return cfg
