# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import numpy as np
import pytest
from pydantic import BaseModel, ValidationError
from pydantic.schema import schema

from azimuth.types import Array


class MyModel(BaseModel):
    class Config:
        # Might not be needed one day see
        # https://github.com/samuelcolvin/pydantic/issues/951#issuecomment-547920677
        json_encoders = {np.ndarray: lambda x: x.tolist()}

    arr: Array[float]


def test_array_init():
    # Check that we validate the schema correctly.
    sch = schema([MyModel])
    assert "Array" in str(sch)
    x = np.array([1, 2, 3])
    mod = MyModel(arr=x)
    # The field is a numpy array
    assert np.allclose(mod.arr + 1, [2, 3, 4])
    # We can json encode the type.
    out = mod.json()
    assert "[1.0, 2.0, 3.0]" in out
    # We can instantiate using a list.
    _ = MyModel(arr=[1, 2, 3])


def test_bad_values():
    class MyModel(BaseModel):
        arr: Array[float, (3,)]

    with pytest.raises(ValidationError):
        _ = MyModel(arr=[1, 2, 3, 4])

    with pytest.raises(ValidationError):
        _ = MyModel(arr=["a", "b", "c"])
