# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import dataclasses
import importlib
import inspect
import os
import re
from itertools import compress

from pydantic.main import BaseModel

import azimuth
from azimuth.modules.base_classes import Module

ROOT_MODULE = os.path.dirname(azimuth.__file__)

modules = ["azimuth"]
# We do not force these functions to be compliant.
accepted_name = [
    "JSONResponseIgnoreNan",
    "compute_on_dataset_split",
    "save_result",
    "create_histogram_mean_std",  # False positive in the exception: *arguments order is wrong.
]
# We do not force these modules to be compliant.
accepted_module = [
    "azimuth.utils.ml.third_parties.contractions",
    "azimuth.utils.ml.third_parties.transformations_types",
]

# Functions or classes with less than 'MIN_CODE_SIZE' lines can be ignored
MIN_CODE_SIZE = 10


def accepted_classtype(cls):
    return issubclass(cls, BaseModel) or dataclasses.is_dataclass(cls)


def handle_class_init(name, member, exceptions):
    init_args = [
        arg
        for arg in list(inspect.signature(member.__init__).parameters.keys())
        if arg not in ["self", "args", "kwargs"]
    ]
    try:
        assert_args_presence(init_args, member.__doc__, member, name, exceptions)
    except Exception as e:
        raise ValueError(f"An exception was raised when validating {name}: {e}")


def handle_class(name, member, exceptions):
    if is_accepted(name, member) or accepted_classtype(member):
        return

    if member.__doc__ is None and not member_too_small(member) and not issubclass(member, Module):
        exceptions.append(
            (
                "{} class doesn't have any documentation".format(name),
                member.__module__,
                inspect.getmodule(member).__file__,
            )
        )

    if not issubclass(member, Module):
        handle_class_init(name, member, exceptions)

    for n, met in inspect.getmembers(member):
        if inspect.isfunction(met) and not n.startswith("_"):
            handle_method(n, met, exceptions)


def handle_function(name, member, exceptions):
    if is_accepted(name, member) or member_too_small(member):
        # We don't need to check this one.
        return
    doc = member.__doc__
    if doc is None:
        exceptions.append(
            (
                "{} function doesn't have any documentation".format(str(member)),
                member.__module__,
                inspect.getmodule(member).__file__,
            )
        )
        return

    args = list(filter(lambda k: k != "self", inspect.signature(member).parameters.keys()))
    try:
        assert_function_style(name, member, doc, args, exceptions)
        assert_args_presence(args, doc, member, name, exceptions)
        assert_doc_style(name, member, doc, args, exceptions)
    except Exception as e:
        raise ValueError(f"An exception was raised when validating {name}: {e}")


def assert_doc_style(name, member, doc, args, exceptions):
    lines = doc.split("\n")
    first_line = lines[0]
    if first_line != "" and first_line.strip()[-1] != ".":
        exceptions.append(("{} first line should end with a '.'".format(member), member.__module__))


def assert_function_style(name, member, doc, args, exceptions):
    code = inspect.getsource(member)
    has_return = re.findall(r"\s*return \S+", code, re.MULTILINE)
    if has_return and "Returns:" not in doc:
        innerfunction = [
            inspect.getsource(x) for x in member.__code__.co_consts if inspect.iscode(x)
        ]
        return_in_sub = [
            ret
            for code_inner in innerfunction
            for ret in re.findall(r"\s*return \S+", code_inner, re.MULTILINE)
        ]
        if len(return_in_sub) < len(has_return):
            exceptions.append(("{} needs a 'Returns:' section".format(member), member.__module__))

    has_raise = re.findall(r"^\s*raise \S+", code, re.MULTILINE)
    if (
        has_raise
        and "Raises:" not in doc
        and not any(["NotImplementedError" in row for row in has_raise])
    ):
        innerfunction = [
            inspect.getsource(x) for x in member.__code__.co_consts if inspect.iscode(x)
        ]
        raise_in_sub = [
            ret
            for code_inner in innerfunction
            for ret in re.findall(r"\s*raise \S+", code_inner, re.MULTILINE)
        ]
        if len(raise_in_sub) < len(has_raise):
            exceptions.append(("{} needs a 'Raises:' section".format(member), member.__module__))

    if len(args) > 0 and "Args:" not in doc:
        exceptions.append(("{} needs a 'Args' section".format(member), member.__module__))

    assert_blank_before(name, member, doc, ["Args:", "Raises:", "Returns:"], exceptions)


def assert_blank_before(name, member, doc, keywords, exceptions):
    doc_lines = [x.strip() for x in doc.split("\n")]
    for keyword in keywords:
        if keyword in doc_lines:
            index = doc_lines.index(keyword)
            if doc_lines[index - 1] != "":
                exceptions.append(
                    (
                        "{} '{}' should have a blank line above.".format(member, keyword),
                        member.__module__,
                    )
                )


def is_accepted(name, member):
    if "azimuth" not in str(member.__module__):
        return True
    return name in accepted_name or member.__module__ in accepted_module


def member_too_small(member):
    code = inspect.getsource(member).split("\n")
    return len(code) < MIN_CODE_SIZE


def assert_args_presence(args, doc, member, name, exceptions):
    if len(args) == 0 or doc is None:
        return
    args_not_in_doc = [arg not in doc for arg in args]
    if any(args_not_in_doc):
        exceptions.append(
            (
                "{} {} arguments are not present in documentation ".format(
                    name, list(compress(args, args_not_in_doc))
                ),
                member.__module__,
            )
        )
        return
    words = doc.replace("*", "").replace(":", " ").split()
    # Check arguments styling
    styles = [re.search(r"^\s*({}):.*$".format(arg), doc, re.MULTILINE) is None for arg in args]
    if any(styles):
        exceptions.append(
            (
                "{} {} are not styled properly 'argument': documentation".format(
                    name, list(compress(args, styles))
                ),
                member.__module__,
            )
        )

    # Check arguments order
    if "Args" in words:
        words = words[words.index("Args") :]
        indexes = [words.index(arg) for arg in args]
        if indexes != sorted(indexes):
            exceptions.append(
                (
                    "{} arguments order is different from the documentation".format(name),
                    member.__module__,
                )
            )


def handle_method(name, member, exceptions):
    if name in accepted_name or member.__module__ in accepted_module:
        return
    handle_function(name, member, exceptions)


def handle_module(mod, exceptions, history):
    history.append(mod)
    for name, mem in inspect.getmembers(mod):
        if inspect.isclass(mem):
            handle_class(name, mem, exceptions)
        elif inspect.isfunction(mem):
            handle_function(name, mem, exceptions)
        elif inspect.ismodule(mem) and (hasattr(mem, "__file__") and ROOT_MODULE in mem.__file__):
            # Only test azimuth' modules
            if mem not in history:
                handle_module(mem, exceptions, history)


def test_doc():
    exceptions = []
    history = []
    for module in modules:
        mod = importlib.import_module(module)
        handle_module(mod, exceptions, history)
    exceptions = set(v[0] for v in exceptions)
    assert not exceptions


if __name__ == "__main__":
    test_doc()
