# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from azimuth.types import AliasModel


class ValidationResponse(AliasModel):
    is_cuda_available: bool
    can_load_model: bool
    can_load_dataset: bool
    model_has_correct_type: bool
    can_make_prediction: bool
    can_make_saliency: bool
