# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import List, Tuple

import numpy as np
from numpy import ndarray

from azimuth.config import ModelContractConfig
from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.modules.base_classes import DatasetResultModule
from azimuth.modules.model_contract_task_mapping import model_contract_task_mapping
from azimuth.modules.task_execution import get_task_result
from azimuth.types import DatasetColumn, SupportedMethod
from azimuth.types.outcomes import OutcomeName
from azimuth.types.task import PredictionResponse
from azimuth.utils.validation import assert_not_none


class OutcomesModule(DatasetResultModule[ModelContractConfig]):
    """Computes the outcome for each utterance in the dataset split."""

    allowed_mod_options = DatasetResultModule.allowed_mod_options | {
        "threshold",
        "pipeline_index",
    }

    def _compute_outcome(self, prediction: int, label: int) -> OutcomeName:
        dm = self.get_dataset_split_manager()
        if prediction == label:
            if label == dm.rejection_class_idx:
                return OutcomeName.CorrectAndRejected
            else:
                return OutcomeName.CorrectAndPredicted
        elif prediction == dm.rejection_class_idx:
            return OutcomeName.IncorrectAndRejected
        else:
            return OutcomeName.IncorrectAndPredicted

    def _get_predictions(self, without_postprocessing: bool) -> ndarray:
        mod_options = self.mod_options.copy(deep=True)
        mod_options.model_contract_method_name = SupportedMethod.PostProcess
        mod_options.indices = self.get_indices()
        prediction_task = model_contract_task_mapping(
            dataset_split_name=self.dataset_split_name,
            config=self.config,
            mod_options=mod_options,
        )
        pred_result = get_task_result(
            task_module=prediction_task, result_type=List[PredictionResponse]
        )

        predictions = np.zeros(len(mod_options.indices))
        for idx, pred in enumerate(pred_result):
            if without_postprocessing:
                predictions[idx] = pred.model_output.preds
            else:
                predictions[idx] = pred.postprocessed_output.preds

        return predictions

    def compute_on_dataset_split(self) -> List[Tuple[OutcomeName, OutcomeName]]:  # type: ignore
        """Compute outcomes for a set of predictions, both with and without postprocessing.

        Returns:
            List of tuple for each utterance with the model outcome and the postprocessed outcome.

        """
        ds = assert_not_none(self.get_dataset_split())
        labels = ds["label"]

        model_predictions = self._get_predictions(without_postprocessing=True)
        model_outcomes: List[OutcomeName] = [
            self._compute_outcome(y_pred, label) for y_pred, label in zip(model_predictions, labels)
        ]

        postprocessed_predictions = self._get_predictions(without_postprocessing=False)
        postprocessed_outcomes: List[OutcomeName] = [
            self._compute_outcome(y_pred, label)
            for y_pred, label in zip(postprocessed_predictions, labels)
        ]

        return list(zip(model_outcomes, postprocessed_outcomes))

    def _save_result(  # type: ignore
        self, res: List[Tuple[OutcomeName, OutcomeName]], dm: DatasetSplitManager
    ):
        """Save the outcomes in the dataset_split.

        Args:
            res: Results from `compute_on_dataset_split`
            dm: the dataset_split manager used to get `res`.
        """
        table_key = assert_not_none(self._get_table_key())
        dm.add_column_to_prediction_table(
            DatasetColumn.model_outcome, [outcomes[0] for outcomes in res], table_key=table_key
        )
        dm.add_column_to_prediction_table(
            DatasetColumn.postprocessed_outcome,
            [outcomes[1] for outcomes in res],
            table_key=table_key,
        )
