from typing import Any, Dict

from pydantic import BaseSettings


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


def fix_union_types(schema: Dict):
    """Replace oneOf with anyOf, which openapi-typescript understands better."""
    for field in schema["properties"].values():
        field = field.get("additionalProperties", field)  # Dict values (if applicable)
        field = field.get("items", field)  # List items (if applicable)

        if "anyOf" in field:
            field["oneOf"] = field.pop("anyOf")


def make_all_properties_required(schema: Dict):
    """pydantic considers fields with default values to be optional, but when the API returns an
    object, all the default values are set, so the fields are always present."""
    schema["required"] = list(schema["properties"].keys())


class AzimuthBaseSettings(BaseSettings):
    class Config:
        alias_generator = to_camel_case
        allow_population_by_field_name = True

        @staticmethod
        def schema_extra(schema):
            fix_union_types(schema)
            make_all_properties_required(schema)
