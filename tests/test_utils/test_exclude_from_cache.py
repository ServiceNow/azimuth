# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import Dict, List, Union

from pydantic import BaseModel, Field

from azimuth.utils.exclude_fields_from_cache import exclude_fields_from_cache


class Sub(BaseModel):
    field: int


class SubWithExcludedField(BaseModel):
    excluded_field: int = Field(..., exclude_from_cache=True)
    field: int


class Model(BaseModel):
    sub: Sub
    excluded_sub_with_excluded_field: SubWithExcludedField = Field(..., exclude_from_cache=True)
    sub_with_excluded_field: SubWithExcludedField
    list_of_sub_with_excluded_field: List[SubWithExcludedField]
    list_of_union: List[Union[SubWithExcludedField, Sub, int]]
    dict_of_union: Dict[str, Union[SubWithExcludedField, Sub, int]]


def test_exclude_from_cache():
    model = Model(
        sub=Sub(field=9),
        excluded_sub_with_excluded_field=SubWithExcludedField(excluded_field=1, field=7),
        sub_with_excluded_field=SubWithExcludedField(excluded_field=2, field=8),
        list_of_sub_with_excluded_field=[SubWithExcludedField(excluded_field=3, field=5)],
        list_of_union=[SubWithExcludedField(excluded_field=4, field=6), Sub(field=10), 11],
        dict_of_union={
            "a": SubWithExcludedField(excluded_field=4, field=6),
            "b": Sub(field=10),
            "c": 11,
        },
    )
    exclude = exclude_fields_from_cache(model)
    assert exclude == {
        "excluded_sub_with_excluded_field": ...,
        "sub_with_excluded_field": {"excluded_field": ...},
        "list_of_sub_with_excluded_field": {0: {"excluded_field": ...}},
        "list_of_union": {0: {"excluded_field": ...}},
        "dict_of_union": {"a": {"excluded_field": ...}},
    }
    assert model.dict(exclude=exclude) == {
        "sub": {"field": 9},
        "sub_with_excluded_field": {"field": 8},
        "list_of_sub_with_excluded_field": [{"field": 5}],
        "list_of_union": [{"field": 6}, {"field": 10}, 11],
        "dict_of_union": {"a": {"field": 6}, "b": {"field": 10}, "c": 11},
    }
