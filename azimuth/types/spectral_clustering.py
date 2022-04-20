from azimuth.types import AliasModel, Array


class SpectralClusteringResponse(AliasModel):
    evals: Array
    evecs: Array
    difference: Array
