# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import List

import numpy as np
from datasets import Dataset
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import reverse_cuthill_mckee
from sklearn.metrics import confusion_matrix

from azimuth.config import ModelContractConfig
from azimuth.modules.base_classes import FilterableModule
from azimuth.types.model_performance import ConfusionMatrixResponse
from azimuth.utils.validation import assert_not_none

MIN_CONFUSION_CUTHILL_MCKEE = 0.1


class ConfusionMatrixModule(FilterableModule[ModelContractConfig]):
    """Computes the confusion matrix on the specified dataset split."""

    allowed_mod_options = FilterableModule.allowed_mod_options | {
        "cf_normalized",
        "cf_preserved_class_order",
    }

    def compute_on_dataset_split(self) -> List[ConfusionMatrixResponse]:  # type: ignore
        """Computes confusion matrix from sklearn.

        Returns:
            Confusion Matrix according to current filters

        """
        ds: Dataset = assert_not_none(self.get_dataset_split())
        predictions, labels = (
            self._get_predictions_from_ds(),
            ds[self.config.columns.label],
        )
        ds_mng = self.get_dataset_split_manager()
        num_classes = ds_mng.get_num_classes()
        class_ids = list(range(num_classes))
        class_names = ds_mng.get_class_names()
        rejection_idx = ds_mng.rejection_class_idx

        cf = confusion_matrix(
            y_true=labels,
            y_pred=predictions,
            labels=class_ids,
            normalize="true" if self.mod_options.cf_normalized else None,
        )

        # Reorder rows and columns so the bandwidth of the matrix is smaller
        if not self.mod_options.cf_preserved_class_order:
            # Get a normalized confusion matrix if not already computed
            if not self.mod_options.cf_normalized:
                cf_normalized = confusion_matrix(
                    y_true=labels, y_pred=predictions, labels=class_ids, normalize="true"
                )
            else:
                cf_normalized = cf

            # Remove the rejection class so it doesn't influence the algorithm
            cf_no_rejection = np.delete(
                np.delete(cf_normalized, rejection_idx, 0), rejection_idx, 1
            )

            # Get order based on reverse_cuthill_mckee algorithm
            order_no_rejection = reverse_cuthill_mckee(
                csr_matrix(cf_no_rejection >= MIN_CONFUSION_CUTHILL_MCKEE)
            )

            # Get class indices by reduced-bandwidth order and add rejection_idx at the end.
            classes_no_rejection = np.delete(class_ids, rejection_idx)
            order = np.append(classes_no_rejection[order_no_rejection], rejection_idx)

            # Put the rejection class last for the confusion matrix
            if rejection_idx != order[-1]:
                rejection_position = np.where(order == rejection_idx)[0][0]
                # From the rejection position, roll backwards all values
                order[rejection_position:] = np.roll(order[rejection_position:], -1)

            # Re-order matrix
            cf = cf[np.ix_(order, order)]
            class_names = [ds_mng.get_class_names()[i] for i in order]

        return [
            ConfusionMatrixResponse(
                confusion_matrix=cf,
                class_names=class_names,
                normalized=self.mod_options.cf_normalized,
                preserved_class_order=self.mod_options.cf_preserved_class_order,
                rejection_class_position=rejection_idx
                if self.mod_options.cf_preserved_class_order
                else num_classes - 1,
            )
        ]
