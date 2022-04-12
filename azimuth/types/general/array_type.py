# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import Generic, TypeVar

import numpy as np

"""
Module that handles numpy arrays in Pydantic models.
Code from: https://github.com/samuelcolvin/pydantic/issues/380
"""

T = TypeVar("T")


class _ArrayMeta(type):
    def __getitem__(self, t):
        """Handles when we do Array[float]"""
        return type("Array", (Array,), {"__dtype__": t})


class Array(np.ndarray, Generic[T], metaclass=_ArrayMeta):
    """Class that allow numpy arrays in Pydantic models."""

    @classmethod
    def __get_validators__(cls):
        yield cls.validate_type

    @classmethod
    def validate_type(cls, val):
        """Validate whether `val` is a numpy array."""
        dtype = getattr(cls, "__dtype__", None)
        if isinstance(dtype, tuple):
            dtype, shape = dtype
        else:
            shape = tuple()

        result = np.array(val, dtype=dtype, copy=False, ndmin=len(shape))
        assert not shape or len(shape) == len(result.shape)  # ndmin guarantees this

        if any((shape[i] != -1 and shape[i] != result.shape[i]) for i in range(len(shape))):
            result = result.reshape(shape)
        return result

    @classmethod
    def __modify_schema__(cls, field_schema):
        # __modify_schema__ should mutate the dict it receives in place,
        field_schema.update(
            # simplified regex here for brevity, see the wikipedia link above
            type="Array",
            # some example postcodes
            examples=[[1, 2, 3], [1, 2, 3]],
        )
