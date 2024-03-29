# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from azimuth.types import AliasModel


class PredictionComparisonResponse(AliasModel):
    pipeline_disagreement: bool
    incorrect_for_all_pipelines: bool
