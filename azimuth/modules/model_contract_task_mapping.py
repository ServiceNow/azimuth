# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import Mapping, Optional, Type

from azimuth.config import ModelContractConfig
from azimuth.modules.base_classes.indexable_module import ModelContractModule
from azimuth.modules.model_contracts.custom_classification import (
    CustomTextClassificationModule,
)
from azimuth.modules.model_contracts.file_based_text_classification import (
    FileBasedTextClassificationModule,
)
from azimuth.modules.model_contracts.hf_text_classification import (
    HFTextClassificationModule,
)
from azimuth.types.general.dataset import DatasetSplitName
from azimuth.types.general.module_options import ModuleOptions
from azimuth.types.general.modules import SupportedModelContract

# Black formats this in a way where the line is too long.
# fmt: off
ALL_MODEL_CONTRACTS: Mapping[str, Type[ModelContractModule]] = {
    SupportedModelContract.file_based_text_classification: FileBasedTextClassificationModule,
    SupportedModelContract.hf_text_classification: HFTextClassificationModule,
    SupportedModelContract.custom_text_classification:
        CustomTextClassificationModule,
}


# fmt: on


def model_contract_task_mapping(
    dataset_split_name: DatasetSplitName,
    config: ModelContractConfig,
    mod_options: Optional[ModuleOptions] = None,
):
    """
    Get the right model contract according to the config.

    Args:
        dataset_split_name: Which dataset_split to compute it on.
        config: Application config.
        mod_options: Options for the Module.

    Returns:
        The right model contract module for the specified method.

    Raises:
        ValueError if the method is unknown.

    """
    model_contract = ALL_MODEL_CONTRACTS.get(config.model_contract)
    if not model_contract:
        raise ValueError(
            f"Cannot find module for {config.model_contract}. "
            f"Must be one of {ALL_MODEL_CONTRACTS.keys()}."
        )
    return model_contract(dataset_split_name, config, mod_options)
