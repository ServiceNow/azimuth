# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from datetime import datetime, timezone
from typing import Dict, Optional

import jsonlines
import structlog
from datasets import DatasetDict

from azimuth.config import (
    AzimuthConfig,
    ModelContractConfig,
    PerturbationTestingConfig,
    SimilarityConfig,
)
from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.types import DatasetSplitName, SupportedModelContract
from azimuth.types.tag import ALL_PREDICTION_TAGS, ALL_STANDARD_TAGS
from azimuth.utils.object_loader import load_custom_object

log = structlog.get_logger()


def load_dataset_from_config(azimuth_config: AzimuthConfig) -> DatasetDict:
    """Loads the dataset from the config and set the eval value that will be used in the app.

    Args:
        azimuth_config: Azimuth Config

    Returns:
        Dataset dict with all splits

    Raises:
        ValueError if neither validation or test exists in the dataset

    """
    if azimuth_config.dataset is None:
        raise ValueError("No dataset configured.")

    dataset_in_config: DatasetDict = load_custom_object(
        azimuth_config.dataset, azimuth_config=azimuth_config
    )
    dataset_train_eval: DatasetDict = DatasetDict()
    if "train" in dataset_in_config and len(dataset_in_config["train"]) > 0:
        dataset_train_eval[DatasetSplitName.train] = dataset_in_config["train"]
    if "validation" in dataset_in_config and len(dataset_in_config["validation"]) > 0:
        dataset_train_eval[DatasetSplitName.eval] = dataset_in_config["validation"]
    elif "test" in dataset_in_config and len(dataset_in_config["test"]) > 0:
        dataset_train_eval[DatasetSplitName.eval] = dataset_in_config["test"]

    if not dataset_train_eval:
        raise ValueError(
            "Unable to find a dataset split named train, validation or test"
            f"Found {tuple(dataset_in_config.keys())}."
        )
    return dataset_train_eval


def save_config(azimuth_config: AzimuthConfig):
    """Append config to config_history.jsonl to retrieve past configs."""
    current_time_utc = str(datetime.now(timezone.utc))
    # TODO https://stackoverflow.com/questions/2333872/how-to-make-file-creation-an-atomic-operation
    with jsonlines.open(azimuth_config.get_config_history_path(), mode="a") as f:
        f.write({"created_on": current_time_utc, "config": azimuth_config.dict()})


def update_config(old_config: AzimuthConfig, partial_config: Dict) -> AzimuthConfig:
    return old_config.copy(update=partial_config, deep=True)


def load_dataset_split_managers_from_config(
    azimuth_config: AzimuthConfig,
) -> Dict[DatasetSplitName, Optional[DatasetSplitManager]]:
    """
    Load all dataset splits for the application.

    Args:
        azimuth_config: Azimuth Configuration.

    Returns:
        For all DatasetSplitName, None or a dataset_split manager.

    """
    dataset = load_dataset_from_config(azimuth_config)

    def make_dataset_split_manager(name: DatasetSplitName):
        return DatasetSplitManager(
            name=name,
            config=azimuth_config,
            initial_tags=ALL_STANDARD_TAGS,
            initial_prediction_tags=ALL_PREDICTION_TAGS,
            dataset_split=dataset[name],
        )

    return {
        dataset_split_name: None
        if dataset_split_name not in dataset
        else make_dataset_split_manager(DatasetSplitName[dataset_split_name])
        for dataset_split_name in [DatasetSplitName.eval, DatasetSplitName.train]
    }


def predictions_available(config: ModelContractConfig) -> bool:
    return config.pipelines is not None


def similarity_available(config: SimilarityConfig) -> bool:
    return config.similarity is not None


def perturbation_testing_available(config: PerturbationTestingConfig) -> bool:
    correct_model_contract = config.model_contract in [
        SupportedModelContract.hf_text_classification,
        SupportedModelContract.custom_text_classification,
        SupportedModelContract.file_based_text_classification,
    ]
    is_enable = config.behavioral_testing is not None and predictions_available(config)
    return correct_model_contract and is_enable


def postprocessing_known(config: ModelContractConfig, pipeline_index) -> bool:
    # Sometimes the postprocessing cannot be edited but we still want show the values in the FE.
    # Example: file-based
    if config.pipelines is None:
        return False
    return config.pipelines[pipeline_index].postprocessors is not None


def postprocessing_editable(config: ModelContractConfig, pipeline_index) -> bool:
    file_based = config.model_contract == SupportedModelContract.file_based_text_classification
    postprocessing_unknown = not postprocessing_known(config, pipeline_index)
    return not (file_based or postprocessing_unknown)


def saliency_available(config: ModelContractConfig):
    return (
        config.model_contract in [SupportedModelContract.hf_text_classification]
        and predictions_available(config)
        and config.saliency_layer is not None
    )
