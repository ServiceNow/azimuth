# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import List

from datasets import Dataset
from sklearn.metrics import confusion_matrix

from azimuth.config import ModelContractConfig
from azimuth.modules.base_classes.aggregation_module import FilterableModule
from azimuth.types.general.dataset import DatasetColumn
from azimuth.types.model_performance import ConfusionMatrixResponse
from azimuth.utils.validation import assert_not_none


class ConfusionMatrixModule(FilterableModule[ModelContractConfig]):
    """Computes the confusion matrix on the specified dataset split."""

    def compute_on_dataset_split(self) -> List[ConfusionMatrixResponse]:  # type: ignore
        """Computes confusion matrix from sklearn.

        Returns:
            Confusion Matrix according to current filters

        """
        ds: Dataset = assert_not_none(self.get_dataset_split())
        predictions, labels = (
            ds[DatasetColumn.postprocessed_prediction],
            ds[self.config.columns.label],
        )
        ds_mng = self.get_dataset_split_manager()
        cf = confusion_matrix(
            y_true=labels,
            y_pred=predictions,
            labels=range(len(ds_mng.class_names)),
            normalize="true",
        )
        return [ConfusionMatrixResponse(confusion_matrix=cf)]
