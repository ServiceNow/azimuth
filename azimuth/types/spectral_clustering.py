from azimuth.types.general.alias_model import AliasModel
from azimuth.types.general.array_type import Array


class SpectralClusteringResponse(AliasModel):
    evals: Array
    evecs: Array
    difference: Array
