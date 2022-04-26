from azimuth.types import AliasModel


class PredictionComparisonResponse(AliasModel):
    one_model_disagrees: bool
    all_models_wrong: bool
