from typing import Dict


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
