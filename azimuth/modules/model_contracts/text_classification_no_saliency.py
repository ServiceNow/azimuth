# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import List

from datasets import Dataset

from azimuth.modules.model_contracts.text_classification import TextClassificationModule
from azimuth.types.task import SaliencyResponse


class TextClassificationNoSaliencyModule(TextClassificationModule):
    def saliency(self, batch: Dataset) -> List[SaliencyResponse]:
        raise NotImplementedError
