# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import Collection, Dict, Mapping, TypeVar

from pydantic import BaseModel

Model = TypeVar("Model", bound=BaseModel)


def exclude_fields_from_cache(model: Model):
    """Exclude pydantic fields with exclude_from_cache=True.

    Args:
        model: Model, inheriting from pydantic.BaseModel.

    Returns: The format expected by pydantic.BaseModel.dict(exclude=...), json() and _iter()
    """
    exclude = dict()
    for key, field in model.__fields__.items():
        if field.field_info.extra.get("exclude_from_cache"):
            exclude[key] = ...  # TODO update pydantic to >=1.9 and change `...` to `True`
        else:
            val = getattr(model, key)
            if isinstance(val, BaseModel):
                set_if(exclude, key, exclude_fields_from_cache(val))
            elif isinstance(val, Collection):
                sub: Dict = dict()
                for sub_key, sub_val in val.items() if isinstance(val, Mapping) else enumerate(val):
                    if isinstance(sub_val, BaseModel):
                        set_if(sub, sub_key, exclude_fields_from_cache(sub_val))
                set_if(exclude, key, sub)
    return exclude


def set_if(d: Dict, key, val):
    if val:
        d[key] = val
