# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import Callable, Dict, Optional

from datasets import DatasetDict
from transformers import AutoTokenizer

from azimuth.config import AzimuthConfig
from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.types.general.dataset import DatasetSplitName
from azimuth.types.tag import ALL_PREDICTION_TAGS, ALL_STANDARD_TAGS
from azimuth.utils.object_loader import load_custom_object
from azimuth.utils.project import load_dataset_from_config
from azimuth.utils.validation import assert_not_none

Hash = int


class ArtifactManager:
    """This class is a singleton which holds different artifacts.

    Artifacts include dataset_split_managers, datasets and models for each config, so they don't
    need to be reloaded many times for a same module.
    """

    instance: Optional["ArtifactManager"] = None

    def __init__(self):
        # The keys of the dict are a hash of the config.
        self.dataset_dict_mapping: Dict[Hash, DatasetDict] = {}
        self.dataset_split_managers_mapping: Dict[
            Hash, Dict[DatasetSplitName, DatasetSplitManager]
        ] = {}
        self.models_mapping: Dict[Hash, Dict[int, Callable]] = {}
        self.tokenizer = None

    @classmethod
    def get_instance(cls):
        if cls.instance is None:
            cls.instance = cls()
        return cls.instance

    def get_dataset_split_manager(
        self, config: AzimuthConfig, name: DatasetSplitName
    ) -> DatasetSplitManager:
        """Get the DatasetSplitManager object associated to a config and a name.

        Args:
            config: config associated to the DatasetSplitManager.
            name: Which DatasetSplitManager to get.

        Returns:
            DatasetSplitManager instance.

        Raises:
            If there is no dataset defined in the config or if the dataset split is not defined.
        """
        if config.dataset is None:
            raise ValueError("No dataset has been specified in config.")
        dataset_dict = self.get_dataset_dict(config)
        if name not in dataset_dict:
            raise ValueError(
                f"No '{name}' dataset in the supplied dataset(s). "
                f"Found {tuple(dataset_dict.keys())}."
            )
        config_key: Hash = config.to_hash()
        if config_key not in self.dataset_split_managers_mapping:
            self.dataset_split_managers_mapping[config_key] = {}
        if name not in self.dataset_split_managers_mapping[config_key]:
            self.dataset_split_managers_mapping[config_key][name] = DatasetSplitManager(
                name=name,
                config=config,
                initial_tags=ALL_STANDARD_TAGS,
                initial_prediction_tags=ALL_PREDICTION_TAGS,
                dataset_split=dataset_dict[name],
            )
        return self.dataset_split_managers_mapping[config_key][name]

    def get_dataset_dict(self, config) -> DatasetDict:
        """Save and get user-defined DatasetDict.

        Will load the DatasetDict if not cached already.

        Args:
            config: config associated to the Dataset.

        Returns:
            DatasetDict associated with the config.
        """
        config_key: Hash = config.to_hash()
        if config_key not in self.dataset_dict_mapping:
            self.dataset_dict_mapping[config_key] = load_dataset_from_config(config)
        return self.dataset_dict_mapping[config_key]

    def get_model(self, config: AzimuthConfig, pipeline_idx: int):
        """Load the model according to the config and the pipeline_idx.

        Args:
            config: config associated to the Model.
            pipeline_idx: pipeline index for which to get the model.

        Returns:
            Loaded model.
        """

        config_key: Hash = config.to_hash()
        if config_key not in self.models_mapping:
            self.models_mapping[config_key] = {}
        if pipeline_idx not in self.models_mapping[config_key]:
            pipelines = assert_not_none(config.pipelines)
            self.models_mapping[config_key][pipeline_idx] = load_custom_object(
                assert_not_none(pipelines[pipeline_idx].model), azimuth_config=config
            )

        return self.models_mapping[config_key][pipeline_idx]

    def get_tokenizer(self):
        if self.tokenizer is None:
            self.tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")
        return self.tokenizer

    @classmethod
    def clear_cache(cls) -> None:
        cls.instance = None
