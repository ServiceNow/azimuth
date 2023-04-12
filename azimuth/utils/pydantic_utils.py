# Taken from https://github.com/samuelcolvin/pydantic/pull/3946/files
# TODO When we update pydantic >= v1.10, we can remove this file and use their create_model()

import warnings
from types import prepare_class, resolve_bases
from typing import TYPE_CHECKING, Any, Dict, Optional, Tuple, Type, TypeVar, Union, cast

from pydantic import BaseConfig, BaseModel, ConfigError
from pydantic.main import inherit_config
from pydantic.utils import is_valid_field

if TYPE_CHECKING:
    from pydantic.typing import AnyClassMethod, DictStrAny  # type: ignore

    Model = TypeVar("Model", bound="BaseModel")


def create_model(
    __model_name: str,
    *,
    __config__: Optional[Type[BaseConfig]] = None,
    __base__: Union[None, Type["Model"], Tuple[Type["Model"], ...]] = None,
    __module__: str = __name__,
    __validators__: Dict[str, "AnyClassMethod"] = None,
    **field_definitions: Any,
) -> Type["Model"]:
    """
    Dynamically create a model.

    Args:
    __model_name: name of the created model
    __config__: config class to use for the new model
    __base__: base class for the new model to inherit from
    __module__: module of the created model
    __validators__: a dict of method names and @validator class methods
    field_definitions: fields of the model (or extra fields if a base is supplied)
        in the format `<name>=(<type>, <default default>)` or `<name>=<default value>, e.g.
        `foobar=(str, ...)` or `foobar=123`, or, for complex use-cases, in the format
        `<name>=<FieldInfo>`, e.g. `foo=Field(default_factory=datetime.utcnow, alias='bar')`

    Returns:
        New Model type

    Raises:
        ConfigError when arguments are not tuples.
    """
    if __base__ is not None:
        if __config__ is not None:
            raise ConfigError("to avoid confusion __config__ and __base__ cannot be used together")
        if not isinstance(__base__, tuple):
            __base__ = (__base__,)
    else:
        __base__ = (cast(Type["Model"], BaseModel),)
    fields = {}
    annotations = {}
    for f_name, f_def in field_definitions.items():
        if not is_valid_field(f_name):
            warnings.warn(
                f'fields may not start with an underscore, ignoring "{f_name}"', RuntimeWarning
            )
        if isinstance(f_def, tuple):
            try:
                f_annotation, f_value = f_def
            except ValueError as e:
                raise ConfigError(
                    "field definitions should either be a tuple of (<type>, <default>) or just a "
                    "default value, unfortunately this means tuples as "
                    "default values are not allowed"
                ) from e
        else:
            f_annotation, f_value = None, f_def
        if f_annotation:
            annotations[f_name] = f_annotation
        fields[f_name] = f_value
    namespace: "DictStrAny" = {"__annotations__": annotations, "__module__": __module__}
    if __validators__:
        namespace.update(__validators__)
    namespace.update(fields)
    if __config__:
        namespace["Config"] = inherit_config(__config__, BaseConfig)
    resolved_bases = resolve_bases(__base__)
    meta, ns, kwds = prepare_class(__model_name, resolved_bases)
    if resolved_bases is not __base__:
        ns["__orig_bases__"] = __base__
    namespace.update(ns)
    return meta(__model_name, resolved_bases, namespace, **kwds)  # type: ignore
