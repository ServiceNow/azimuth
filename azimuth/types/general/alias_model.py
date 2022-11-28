# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import Any, Dict, List

import numpy as np
import orjson
from pydantic import BaseModel, Extra, Field

from azimuth.utils.conversion import orjson_dumps
from azimuth.utils.pydantic_utils import create_model


def to_camel_case(string: str) -> str:
    """Takes a snake_case string and transforms it to camelCase.

    Args:
        string: The snake_case string to transform.

    Returns: The camelCase result.
    """
    words = string.split("_")
    for idx in range(1, len(words)):
        words[idx] = words[idx].capitalize()
    return "".join(words)


class AliasModel(BaseModel):
    """This model should be used as the base for any model that defines aliases to ensure
    that all fields are represented correctly.
    """

    def dict(self, *, by_alias: bool = False, **kwargs: Any) -> Dict[str, Any]:
        return super().dict(by_alias=True, **kwargs)

    def no_alias_dict(self, **kwargs: Any) -> Dict[str, Any]:
        return super().dict(by_alias=False, **kwargs)

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
