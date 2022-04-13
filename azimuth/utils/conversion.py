# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import hashlib
import pickle
from collections import Counter
from typing import Any, List

import numpy as np
import orjson
from starlette.responses import JSONResponse

Hash = str


def flatten(lst: List[List]) -> List:
    return sum(lst, [])


def md5_hash(d) -> Hash:
    """Hash any structure!
    No Security because we use it only to get a unique id.
    """
    return hashlib.md5(orjson_dumps(d)).hexdigest()  # nosec


def to_pickle_bytes(arr):
    # Used for serialization only.
    pickled_str = pickle.dumps(arr)  # nosec
    return np.array(pickled_str)


def from_pickle_bytes(arr):
    # Used for serialization only.
    return pickle.loads(arr)  # nosec


def orjson_dumps(v, *, default=...):
    return orjson.dumps(
        v, default=default, option=orjson.OPT_NON_STR_KEYS | orjson.OPT_SERIALIZE_NUMPY
    )


class JSONResponseIgnoreNan(JSONResponse):
    """Copy of `starlette.JSONResponse`, but using `orjson.dumps` instead of `json.dumps`.

    It is faster and serializes nan as null.

    """

    def render(self, content: Any) -> Any:
        return orjson_dumps(content)


def merge_counters(counter1, counter2) -> Counter:
    """Merge two counters.

    We can't use c1 + c2 as it removes 0. Instead, we create a new Counter.

    Args:
        counter1: first counter
        counter2: second counter

    Returns:
        Merged counter with 0 still there.
    """
    return Counter(**{**counter1, **counter2})
