# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import List

import numpy as np
from numpy import ndarray

from azimuth.config import ModelContractConfig
from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.modules.base_classes import DatasetResultModule
from azimuth.modules.model_contract_task_mapping import model_contract_task_mapping
from azimuth.types import DatasetColumn, SupportedMethod
from azimuth.types.outcomes import OutcomeName, OutcomeResponse
from azimuth.utils.ml.model_performance import compute_outcome
from azimuth.utils.validation import assert_not_none


class OutcomesModule(DatasetResultModule[ModelContractConfig]):
    """Computes the outcome for each utterance in the dataset split."""

    required_mod_options = {"pipeline_index"}
    optional_mod_options = DatasetResultModule.optional_mod_options | {"threshold", "use_bma"}

    def _get_predictions(self, without_postprocessing: bool) -> ndarray:
        mod_options = self.mod_options.copy(deep=True)
        mod_options.model_contract_method_name = SupportedMethod.PostProcess
        mod_options.indices = self.get_indices()
        prediction_task = model_contract_task_mapping(
            dataset_split_name=self.dataset_split_name,
            config=self.config,
            mod_options=mod_options,
        )
        pred_result = prediction_task.compute_on_dataset_split()

        predictions = np.zeros(len(mod_options.indices))
        for idx, pred in enumerate(pred_result):
            if without_postprocessing:
                predictions[idx] = pred.model_output.preds
            else:
                predictions[idx] = pred.postprocessed_output.preds

        return predictions

    def compute_on_dataset_split(self) -> List[OutcomeResponse]:  # type: ignore
        """Compute outcomes for a set of predictions, both with and without postprocessing.

        Returns:
            List of tuple for each utterance with the model outcome and the postprocessed outcome.

        """
        dm = self.get_dataset_split_manager()
        ds = assert_not_none(self.get_dataset_split())
        labels = ds[self.config.columns.label]

        model_predictions = self._get_predictions(without_postprocessing=True)
        model_outcomes: List[OutcomeName] = [
            compute_outcome(y_pred, label, dm.rejection_class_idx)
            for y_pred, label in zip(model_predictions, labels)
        ]

        postprocessed_predictions = self._get_predictions(without_postprocessing=False)
        postprocessed_outcomes: List[OutcomeName] = [
            compute_outcome(y_pred, label, dm.rejection_class_idx)
            for y_pred, label in zip(postprocessed_predictions, labels)
        ]

        return [
            OutcomeResponse(
                model_outcome=model_outcome, postprocessed_outcome=postprocessed_outcome
            )
            for model_outcome, postprocessed_outcome in zip(model_outcomes, postprocessed_outcomes)
        ]

    def _save_result(self, res: List[OutcomeResponse], dm: DatasetSplitManager):  # type: ignore
        """Save the outcomes in the dataset_split.

        Args:
            res: Results from `compute_on_dataset_split`
            dm: the dataset_split manager used to get `res`.
        """
        table_key = assert_not_none(self._get_table_key())
        dm.add_column_to_prediction_table(
            DatasetColumn.model_outcome,
            [outcomes.model_outcome for outcomes in res],
            table_key=table_key,
        )
        dm.add_column_to_prediction_table(
            DatasetColumn.postprocessed_outcome,
            [outcomes.postprocessed_outcome for outcomes in res],
            table_key=table_key,
        )
