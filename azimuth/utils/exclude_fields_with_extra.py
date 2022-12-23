from typing import Dict

from pydantic import BaseModel
from pydantic.fields import SHAPE_SINGLETON, ModelField


def exclude_fields_with_extra(fields: Dict[str, ModelField], extra: str):
    exclude = dict()
    for key, field in fields.items():
        if field.field_info.extra.get(extra):
            exclude[key] = ...  # TODO update pydantic to >=1.9 and change `...` to `True`
        elif issubclass(field.type_, BaseModel):
            sub = exclude_fields_with_extra(field.type_.__fields__, extra)
            if sub:
                exclude[key] = sub if field.shape == SHAPE_SINGLETON else {"__all__": sub}
    return exclude
