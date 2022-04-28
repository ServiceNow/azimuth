from azimuth.types import AliasModel


class PredictionComparisonResponse(AliasModel):
    pipeline_disagreement: bool
    incorrect_for_all_pipelines: bool
