# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import List

from azimuth.types import AliasModel


class PreprocessingStepItem(AliasModel):
    order: int
    text: str
    class_name: str


class PreprocessingStep(AliasModel):
    order: int
    text: List[str]
    class_name: str

    def __getitem__(self, item: int) -> "PreprocessingStep":
        return PreprocessingStep(
            order=self.order, text=[self.text[item]], class_name=self.class_name
        )
