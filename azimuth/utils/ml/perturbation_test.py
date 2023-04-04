# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from dataclasses import dataclass
from typing import Callable, List, Optional, Tuple

from azimuth.config import PerturbationTestingConfig
from azimuth.types.perturbation_testing import (
    PerturbationTestClass,
    PerturbationTestFailureReason,
    PerturbationTestFamily,
    PerturbationTestName,
    PerturbationTestType,
    PerturbedUtteranceDetails,
)


@dataclass
class PerturbationTest:
    """Used in PerturbationTestingModule to create different perturbations on the dataset_split."""

    name: PerturbationTestName
    family: PerturbationTestFamily
    test_fn: Callable[[str, PerturbationTestingConfig], List[PerturbedUtteranceDetails]]
    test_type: PerturbationTestType
    test_class: PerturbationTestClass
    conf_delta_threshold: float  # Delta in confidence which will fail the test.
    expect_flip: bool  # Whether we expect the prediction to flip or not.
    description: str = "No Description"

    def is_failed(
        self, new_pred: Tuple[int, float], original_pred: Tuple[int, float]
    ) -> Tuple[bool, PerturbationTestFailureReason, Optional[float]]:
        """
        Check if a test has failed given the original and modified predictions.

        Args:
            new_pred: Predicted class and conf of the perturbed utterance.
            original_pred:  Predicted class and conf of the original utterance.

        Returns:
            [is_failed, failure_reason, confidence delta]
        """
        # Check if the test failed according to a threshold.
        new_pred_class, new_conf = new_pred
        ori_pred_class, ori_conf = original_pred
        delta_conf = round(abs(new_conf - ori_conf), 4)
        if not self.expect_flip and new_pred_class != ori_pred_class:

            # if the delta of confidence is not applicable we report None
            return True, PerturbationTestFailureReason.PredClass, None
        elif self.expect_flip and new_pred_class == ori_pred_class:

            # if the delta of confidence is not applicable we report None
            return True, PerturbationTestFailureReason.PredClass, None
        elif delta_conf > self.conf_delta_threshold:
            return True, PerturbationTestFailureReason.PredConfThreshold, delta_conf
        else:
            # if the delta of confidence is not applicable we report the conf.
            return False, PerturbationTestFailureReason.NA, delta_conf
