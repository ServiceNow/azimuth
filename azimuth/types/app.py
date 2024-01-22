# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import Any, Dict, List, Optional

from pydantic import Field

from azimuth.types import AliasModel, DatasetSplitName, SupportedModelContract
from azimuth.types.perturbation_testing import PerturbationTestSummary
from azimuth.types.tag import DataAction, SmartTag


class StatusResponse(AliasModel):
    startup_tasks_ready: bool = Field(..., title="Startup tasks ready")
    startup_tasks_status: Dict[str, str] = Field(..., title="Startup tasks status")


class AvailableDatasetSplits(AliasModel):
    train: bool
    eval: bool


class UtteranceCountPerDatasetSplit(AliasModel):
    train: Optional[int] = Field(..., nullable=True)
    eval: Optional[int] = Field(..., nullable=True)


class DatasetInfoResponse(AliasModel):
    project_name: str = Field(..., title="Name of the project")
    data_actions: List[DataAction] = Field(..., title="Data action tags")
    smart_tags: List[SmartTag] = Field(..., title="Smart tags")
    startup_tasks: Dict[str, Any] = Field(..., title="Startup tasks status")
    model_contract: SupportedModelContract = Field(..., title="Model Contract in the config.")
    prediction_available: bool = Field(..., title="Indicator if prediction values are available.")
    perturbation_testing_available: bool = Field(
        ..., title="Indicator if perturbation_tests are available."
    )
    available_dataset_splits: AvailableDatasetSplits = Field(
        ..., title="Which dataset splits are available."
    )
    utterance_count_per_dataset_split: UtteranceCountPerDatasetSplit = Field(
        ..., title="Utterance count per dataset split."
    )
    similarity_available: bool = Field(..., title="Indicator if similarities are available.")
    model_averaging_available: bool = Field(..., title="Indicator if model averaging is available.")
    postprocessing_editable: Optional[List[bool]] = Field(
        ..., title="Indicator if postprocessing can be overwritten.", nullable=True
    )


class PerturbationTestingSummary(AliasModel):
    all_tests_summary: List[PerturbationTestSummary]
    failure_rates: Dict[DatasetSplitName, float]
