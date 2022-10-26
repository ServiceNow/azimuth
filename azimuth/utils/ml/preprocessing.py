# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import List

from azimuth.types import AliasModel


class PreprocessingStepItem(AliasModel):
    """Class for saving the results in the dataset and the routes."""

    order: int
    text: str
    class_name: str


class PreprocessingStep(AliasModel):
    """Class received from the pipeline, and used in the Prediction Module."""

    order: int
    text: List[str]
    class_name: str

    def __getitem__(self, item: int) -> "PreprocessingStep":
        """Useful to get from a batch result to a single utterance result."""
        return PreprocessingStep(
            order=self.order, text=[self.text[item]], class_name=self.class_name
        )
