# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import Any, List, Optional, TypeVar

T = TypeVar("T")


def assert_not_none(val: Optional[T]) -> T:
    """
    This function makes sure that the variable is not None and has a fixed type for mypy purposes.

    Args:
        val: any value which is Optional.

    Returns:
        val [T]: The same value with a defined type.

    Raises:
        Assertion error if val is None.

    """
    if val is None:
        raise AssertionError(f"value of {val} is None, expected not None")
    return val


def assert_is_list(val: Any) -> List:
    """
    This function makes sure that the variable is a list as a fixed type for mypy purposes.

    Args:
        val: any value which is a List.

    Returns:
        val [T]: The same value with a defined type.

    Raises:
        Assertion error if val is not a List.

    """
    if not isinstance(val, List):
        raise AssertionError(f"value of {val} is not a List, expected a List")
    return val
