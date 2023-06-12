# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import importlib
import inspect
import os
import subprocess
import sys

import structlog

from azimuth.config import AzimuthValidationError, CustomObject

log = structlog.get_logger(__file__)


def install(remote: str):
    """
    Install a Python package.

    Args:
        remote: Can be a path to a folder with a setup.py
                        or a package name in pip
                        or a **public** git repository remote.

    Raises:
        FileNotFoundError if we can't find the remote locally or on Pypi.
    """
    if os.path.exists(remote):
        if os.path.isfile(os.path.join(remote, "setup.py")):
            # Install locally
            log.info(subprocess.check_call(["pip", "install", remote]))
        elif os.path.isfile(os.path.join(remote, "requirements.txt")):
            # Install deps locally
            log.info(
                subprocess.check_call(
                    [
                        "pip",
                        "install",
                        "-t",
                        remote,
                        "-r",
                        os.path.join(remote, "requirements.txt"),
                    ]
                )
            )
        # In any case, add the repo the system path.
        sys.path.insert(0, remote)
    else:
        # We assume that this is a package
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", remote])
        except subprocess.CalledProcessError:
            # Was probably a misspecified folder
            raise AzimuthValidationError(f"Can't find remote {repr(remote)} locally or on Pypi.")
    importlib.invalidate_caches()


def load_custom_object(
    value: CustomObject, reject=None, allow_install_package=True, force_kwargs=False, **kwargs
):
    """
    Load an object dynamically and recursively.

    Args:
        value: Custom objects to instantiate.
        reject: List of `kwargs` to remove from the func call.
        allow_install_package: If True, will install missing packages.
        force_kwargs: If True will send all supplied kwargs to the class.
                        This can break the supplied class
                        if they don't accept extra parameters in **kwargs.

        kwargs: Args to add to the function.

    Returns:
        Object
    """
    if value.remote and allow_install_package:
        install(value.remote)
    return load_class(kwargs, reject, value, force_kwargs=force_kwargs)


def get_class_init_varnames(cls):
    # We check if func.__init__ is overloaded, otherwise func.__init__ has no attribute __code__.
    return cls.__init__.__code__.co_varnames if cls.__init__ != object.__init__ else []


def load_args(v, kwargs):
    if isinstance(v, CustomObject):
        return load_custom_object(v, **kwargs)
    if isinstance(v, list):
        return [load_args(vi, kwargs) for vi in v]
    else:
        return v


def load_class(kwargs, reject, value, force_kwargs=False):
    """
    Will recursively load an object.

    Args:
        kwargs: additional kwargs for the function.
        reject: list of arguments you do not want to include.
        value: A Dict with key `class` where the classname is.
        force_kwargs: If True will send all supplied kwargs to the class.
                        This can break the supplied class
                        if they don't accept extra parameters in **kwargs.

    Returns:
        object, the loaded object.
    """
    try:
        func = load_obj(value.class_name)
    except (ModuleNotFoundError, AttributeError) as e:
        raise AzimuthValidationError(f"Invalid class_name {repr(value.class_name)}: {e}")

    varnames = get_class_init_varnames(func) if inspect.isclass(func) else func.__code__.co_varnames

    not_present = {k: v for k, v in kwargs.items() if k not in varnames}

    # Manage kwargs (we override the value if needed here!!)
    kwargs_ins = {**value.kwargs, **kwargs}
    # Argument supplied by us can't modify **kwargs from the method.
    kwargs_ins = {k: v for k, v in kwargs_ins.items() if k not in not_present or force_kwargs}

    if reject is not None:
        kwargs_ins = {k: v for k, v in kwargs.items() if k not in reject}
    kwargs_ins = {k: load_args(v, kwargs) for k, v in kwargs_ins.items()}

    try:
        obj = func(*value.args, **kwargs_ins)
    except Exception as e:
        raise AzimuthValidationError(e)
    return obj


def load_obj(cls):
    """Get the function object and load the required modules."""
    mod, cls = cls.rsplit(".", 1)
    return getattr(importlib.import_module(mod), cls)
