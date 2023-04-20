# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
import warnings
from typing import Optional

# TODO structlog warning issue tracked in BaaL #192
with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    from baal.bayesian import Dropout
    from baal.bayesian.dropout import Dropout2d, patch_module
from torch import nn


def unpatch_module(module: nn.Module) -> bool:
    """
    Recursively iterate over the children of a module and replace them if
    they are a BaaL dropout layer. This function operates in-place.

    Args:
        module: Module to unpatch dropout layers.

    Returns:
        Flag indicating if a layer was modified.
    """
    changed = False
    for name, child in module.named_children():
        new_module: Optional[nn.Module] = None
        if isinstance(child, Dropout):
            new_module = nn.Dropout(p=child.p, inplace=child.inplace)
        elif isinstance(child, Dropout2d):
            new_module = nn.Dropout2d(p=child.p, inplace=child.inplace)

        if new_module is not None:
            changed = True
            module.add_module(name, new_module)

        # recursively apply to child
        changed |= unpatch_module(child)
    return changed


class MCDropout:
    """
    Context manager that will modify
     Dropout layer and revert at the end.

    Args:
        mod: Pytorch Module to modify
    """

    def __init__(self, mod: nn.Module):
        self.mod = patch_module(mod)

    def __enter__(self):
        return self.mod

    def __exit__(self, type, value, traceback):
        unpatch_module(self.mod)
        # Need to call eval again because Module are train=True by default.
        self.mod.eval()
