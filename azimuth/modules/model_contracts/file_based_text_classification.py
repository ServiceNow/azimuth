# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import List, cast

from datasets import Dataset

from azimuth.modules.model_contracts.text_classification_no_saliency import (
    TextClassificationNoSaliencyModule,
)
from azimuth.modules.task_execution import get_task_result
from azimuth.types import DatasetColumn, ModuleOptions, SupportedMethod
from azimuth.types.task import PredictionResponse


class FileBasedTextClassificationModule(TextClassificationNoSaliencyModule):
    """Module that does not require a model.

    To get predictions, read them from the same file that contains the test examples (csv).

    """

    def predict(self, batch: Dataset) -> List[PredictionResponse]:
        """Predict the bath of utterances.

        For utterances in the test set, predictions will be read from the prediction file. For
        utterances in the training set, the predictions will be hard-coded to the labels.

        Args:
            batch: Utterances.

        Returns:
            Predictions for the batch.

        """
        # We only have predictions for the test set
        model = self.get_model()
        model_out = model(batch, self.dataset_split_name)
        # Ignore postprocessing as we expect file-based to be postprocessed already.
        raw, _, _, _ = self.get_postprocessed_output(batch, model_out)
        epistemic = [0.0] * len(batch[DatasetColumn.row_idx])
        return self._parse_prediction_output(batch, raw, raw, [], [], epistemic)

    def post_process(self, batch: Dataset) -> List[PredictionResponse]:
        """In File-Based, predictions from the file are already post-processed.
        As such, we just retrieve the predictions from the cache. We cannot change the
        post-processors.

         Args:
            batch: Utterances.

        Returns:
            Predictions for the batch.
        """
        predictions_task = type(self)(
            dataset_split_name=self.dataset_split_name,
            config=self.config,
            mod_options=ModuleOptions(
                model_contract_method_name=SupportedMethod.Predictions,
                pipeline_index=self.mod_options.pipeline_index,
                indices=cast(List[int], batch[DatasetColumn.row_idx]),
            ),
        )
        predictions = get_task_result(
            task_module=predictions_task, result_type=List[PredictionResponse]
        )

        return predictions
