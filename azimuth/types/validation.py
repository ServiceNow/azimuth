from azimuth.types import AliasModel


class ValidationResponse(AliasModel):
    is_cuda_available: bool
    can_load_model: bool
    can_load_dataset: bool
    model_has_correct_type: bool
    can_make_prediction: bool
    can_make_saliency: bool
