# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import Callable, List

import structlog
from datasets import Dataset

from azimuth.modules.base_classes import ModelContractModule
from azimuth.modules.model_contracts.text_classification_no_saliency import (
    TextClassificationNoSaliencyModule,
)
from azimuth.types.task import PredictionResponse

log = structlog.get_logger(__file__)


class CustomTextClassificationModule(TextClassificationNoSaliencyModule):
    """Handles text classification prediction where we are not using HuggingFace
    as the underlying framework.


    Notes:
        This should be able to handle any framework/models,
         but it doesn't support saliency.
    """

    optional_mod_options = ModelContractModule.optional_mod_options | {"iterations", "use_bma"}

    def predict(self, batch: Dataset) -> List[PredictionResponse]:
        """Predict the bath of utterances. The epistemic uncertainty is dummy.

        Args:
            batch: Batch of utterances.

        Returns:
            Predictions for the batch.

        """
        utterances = batch[self.config.columns.text_input]

        # In this case, the model is a Callable, not a Pipeline
        model: Callable = self.get_model()
        # dummy epistemic
        epistemic = [0.0] * len(utterances)
        model_out = model(utterances)
        (
            raw,
            postprocessed,
            preprocessing_steps,
            postprocessing_steps,
        ) = self.get_postprocessed_output(batch, model_out)

        return self._parse_prediction_output(
            batch, raw, postprocessed, preprocessing_steps, postprocessing_steps, epistemic
        )
