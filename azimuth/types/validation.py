from typing import List

from azimuth.types.general.alias_model import AliasModel


class ValidationResponse(AliasModel):
    is_cuda_available: bool
    can_load_model: bool
    can_load_dataset: bool
    model_has_correct_type: bool
    can_make_prediction: bool
    can_make_saliency: bool
    exceptions: List[Exception]

    class Config:
        arbitrary_types_allowed = True
