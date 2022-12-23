from typing import Dict

from pydantic import BaseModel
from pydantic.fields import SHAPE_SINGLETON, ModelField


def exclude_fields_with_extra(fields: Dict[str, ModelField], extra: str):
    """Exclude pydantic fields with given extra keyword argument.

    Args:
        fields: Usually pydantic.BaseModel.__field__.
        extra: The extra keyword argument to look for in each field.

    Returns: The format expected by pydantic.BaseModel.dict(exclude=...), json() and _iter()

    """
    exclude = dict()
    for key, field in fields.items():
        if field.field_info.extra.get(extra):
            exclude[key] = ...  # TODO update pydantic to >=1.9 and change `...` to `True`
        else:
            try:
                if issubclass(field.type_, BaseModel):
                    sub = exclude_fields_with_extra(field.type_.__fields__, extra)
                    if sub:
                        exclude[key] = sub if field.shape == SHAPE_SINGLETON else {"__all__": sub}
            except TypeError:
                pass
    return exclude
