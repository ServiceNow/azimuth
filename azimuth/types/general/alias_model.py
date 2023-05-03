# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import Dict, List

import numpy as np
import orjson
from pydantic import BaseModel, Extra, Field

from azimuth.utils.conversion import orjson_dumps
from azimuth.utils.openapi import fix_union_types, to_camel_case
from azimuth.utils.pydantic_utils import create_model


class AliasModel(BaseModel):
    """This model should be used as the base for any model that defines aliases to ensure
    that all fields are represented correctly.
    """

    @classmethod
    def with_fields(cls, name, *bases, **field_definitions):
        return create_model(name, __base__=(cls, *bases), **field_definitions)

    class Config:
        allow_population_by_field_name = True
        alias_generator = to_camel_case
        extra = Extra.forbid
        json_encoders = {np.ndarray: lambda x: x.tolist()}
        json_loads = orjson.loads
        json_dumps = orjson_dumps
        schema_extra = fix_union_types


class ModuleResponse(AliasModel):
    ...


class InputResponse(ModuleResponse):
    input: str


class PaginationParams(AliasModel):
    limit: int = Field(..., title="Limit")
    offset: int = Field(..., title="Offset")


class PlotSpecification(AliasModel):
    data: List
    layout: Dict
