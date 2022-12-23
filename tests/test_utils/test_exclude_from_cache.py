from typing import List

from pydantic import BaseModel, Field

from azimuth.utils.exclude_fields_with_extra import exclude_fields_with_extra


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


def test_exclude_from_cache():
    model = Model(
        sub=Sub(field=9),
        excluded_sub_with_excluded_field=SubWithExcludedField(excluded_field=1, field=7),
        sub_with_excluded_field=SubWithExcludedField(excluded_field=2, field=8),
        list_of_sub_with_excluded_field=[SubWithExcludedField(excluded_field=3, field=5)],
    )
    exclude = exclude_fields_with_extra(model.__fields__, "exclude_from_cache")
    assert exclude == {
        "excluded_sub_with_excluded_field": ...,
        "sub_with_excluded_field": {"excluded_field": ...},
        "list_of_sub_with_excluded_field": {"__all__": {"excluded_field": ...}},
    }
    assert model.dict(exclude=exclude) == {
        "sub": {"field": 9},
        "sub_with_excluded_field": {"field": 8},
        "list_of_sub_with_excluded_field": [{"field": 5}],
    }
