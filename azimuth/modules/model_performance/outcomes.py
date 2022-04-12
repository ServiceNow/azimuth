# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import List

import numpy as np
from numpy import ndarray

from azimuth.config import ModelContractConfig
from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.modules.base_classes.indexable_module import DatasetResultModule
from azimuth.modules.model_contract_task_mapping import model_contract_task_mapping
from azimuth.types.general.dataset import DatasetColumn
from azimuth.types.general.modules import SupportedMethod
from azimuth.types.outcomes import OutcomeName
from azimuth.utils.validation import assert_not_none


class OutcomesModule(DatasetResultModule[ModelContractConfig]):
    """Computes the outcome for each utterance in the dataset split."""

    allowed_mod_options = DatasetResultModule.allowed_mod_options | {"threshold", "pipeline_index"}

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

    def _get_postprocessed_predictions(self) -> ndarray:
        mod_options = self.mod_options.copy(deep=True)
        mod_options.model_contract_method_name = SupportedMethod.PostProcess
        mod_options.indices = self.get_indices()
        postprocessing_task = model_contract_task_mapping(
            dataset_split_name=self.dataset_split_name,
            config=self.config,
            mod_options=mod_options,
        )
        postprocessed_predictions = postprocessing_task.compute_on_dataset_split()

        predictions = np.zeros(len(mod_options.indices))
        for idx, pred in enumerate(postprocessed_predictions):
            predictions[idx] = pred.postprocessed_output.preds

        return predictions

    def compute_on_dataset_split(self) -> List[OutcomeName]:  # type: ignore
        """Compute outcomes for a set of predictions.

        Returns:
            List of outcomes for each utterance in the dataset split.

        """
        ds = assert_not_none(self.get_dataset_split())
        postprocessed_predictions = self._get_postprocessed_predictions()
        labels = ds["label"]

        outcomes_list: List[OutcomeName] = [
            self._compute_outcome(y_pred, label)
            for y_pred, label in zip(postprocessed_predictions, labels)
        ]

        return outcomes_list

    def _save_result(self, res: List[OutcomeName], dm: DatasetSplitManager):  # type: ignore
        """Save the outcomes in the dataset_split.

        Args:
            res: Results from `compute_on_dataset_split`
            dm: the dataset_split manager used to get `res`.
        """
        table_key = assert_not_none(self._get_table_key())
        dm.add_column_to_prediction_table(DatasetColumn.outcome, res, table_key=table_key)
