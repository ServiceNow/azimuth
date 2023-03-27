# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from enum import Enum
from typing import Dict, List, Optional, Union

from pydantic import Field
from pydantic.types import StrictFloat, StrictInt

from azimuth.types import AliasModel, PlotSpecification


class Agg(str, Enum):
    mean = "mean"
    std = "std"


class FormatType(str, Enum):
    Integer = "Integer"
    Percentage = "Percentage"
    Decimal = "Decimal"


class DatasetDistributionComparisonValue(AliasModel):
    value: Optional[Union[StrictInt, StrictFloat]] = Field(..., nullable=True)
    alert: bool


class DatasetDistributionComparison(AliasModel):
    name: str
    alert: bool
    data: List[DatasetDistributionComparisonValue]


class DatasetWarningPlots(AliasModel):
    overall: PlotSpecification
    per_class: Optional[Dict[str, PlotSpecification]] = Field(..., nullable=True)


class DatasetWarning(AliasModel):
    name: str
    description: str
    columns: List[str]
    format: FormatType
    comparisons: List[DatasetDistributionComparison]
    plots: DatasetWarningPlots


class DatasetWarningGroup(AliasModel):
    name: str
    warnings: List[DatasetWarning]


class DatasetWarningsResponse(AliasModel):
    warning_groups: List[DatasetWarningGroup]
