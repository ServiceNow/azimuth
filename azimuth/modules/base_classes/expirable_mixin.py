# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
import abc


class ExpirableMixin(abc.ABC):
    """Module that can get expired based on changes in the dataset.

    This class should be added to Modules which results can expire when the dataset is updated.
    The most obvious examples are modules affected by filters, since data action tags can
    change based on user actions.

    """

    _time: float

    def is_expired(self, compared_to: float):
        # Check if this Module results are expired.
        return self._time < compared_to
