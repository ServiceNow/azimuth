# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from azimuth.modules.base_classes import ArtifactManager, Module
from azimuth.types import DatasetSplitName


def test_artifact_manager(simple_text_config, file_text_config_top1):
    am = ArtifactManager.get_instance()

    # ArtifactManager is empty
    assert len(am.dataset_dict_mapping) == 0

    # Load 2 dataset splits
    am.get_dataset_split_manager(simple_text_config, DatasetSplitName.eval)
    am.get_dataset_split_manager(file_text_config_top1, DatasetSplitName.eval)
    assert len(am.dataset_dict_mapping) == 2
    assert len(am.dataset_split_managers_mapping) == 2

    # Assert Dataset Split Managers are different
    assert (
        am.dataset_split_managers_mapping[simple_text_config.get_project_hash()][
            DatasetSplitName.eval
        ].num_rows
        != am.dataset_split_managers_mapping[file_text_config_top1.get_project_hash()][
            DatasetSplitName.eval
        ].num_rows
    )

    am.clear_cache()
    new_am = ArtifactManager.get_instance()
    assert len(new_am.dataset_dict_mapping) == 0


def test_artifact_manager_from_module(simple_text_config, file_text_config_top1):
    mod = Module(DatasetSplitName.eval, simple_text_config)
    mod.get_dataset_split()

    # Make sure the first module have access to only one dataset split manager.
    dm_mapping = mod.artifact_manager.dataset_split_managers_mapping
    assert len(dm_mapping) == 1  # Only one config is saved.
    assert len(dm_mapping[mod.config.get_project_hash()]) == 1

    # New Module with another DatasetSplit
    mod2 = Module(DatasetSplitName.train, simple_text_config)
    mod2.get_dataset_split()

    # Make sure the first module now have access to two dataset split managers.
    dm_mapping = mod.artifact_manager.dataset_split_managers_mapping
    assert len(dm_mapping[mod2.config.get_project_hash()]) == 2

    # New Module with another Config
    mod3 = Module(DatasetSplitName.eval, file_text_config_top1)
    mod3.get_dataset_split()

    # Make sure the first module now have access to two configs.
    dm_mapping = mod.artifact_manager.dataset_split_managers_mapping
    assert len(dm_mapping) == 2
    assert len(dm_mapping[mod3.config.get_project_hash()]) == 1

    # Clear cache in first module
    mod.clear_cache()
    # Assess the third module has a cleaned cache too
    assert len(mod3.artifact_manager.dataset_split_managers_mapping) == 0
