# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
import random

import numpy as np


class RandomContext:
    """
    Set seed for `random` and `numpy` and when exiting set the original back.

    Args:
        seed: seed for the random generator.
    """

    def __init__(self, seed):
        self.seed = seed
        self.rnd_ctx = random.getstate()
        self.np_ctx = np.random.get_state()

    def __enter__(self):
        random.seed(self.seed)
        np.random.seed(self.seed)

    def __exit__(self, exc_type, exc_val, exc_tb):
        random.setstate(self.rnd_ctx)
        np.random.set_state(self.np_ctx)
