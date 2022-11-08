# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
import abc
import dataclasses
from abc import ABC, abstractmethod
from typing import Callable, Dict, List, Optional, Set, cast

import numpy as np
from datasets import Dataset

from azimuth.config import ModelContractConfig
from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.modules.base_classes import ConfigScope, Module
from azimuth.types import (
    DatasetColumn,
    DatasetSplitName,
    InputResponse,
    ModuleOptions,
    ModuleResponse,
    SupportedMethod,
)
from azimuth.types.tag import SmartTag
from azimuth.types.task import PredictionResponse, SaliencyResponse
from azimuth.utils.ml.model_performance import compute_outcome
from azimuth.utils.ml.postprocessing import (
    PostProcessingIO,
    PostprocessingStep,
    PostprocessingStepItem,
    PredictionDetails,
)
from azimuth.utils.ml.preprocessing import PreprocessingStepItem
from azimuth.utils.object_loader import load_custom_object
from azimuth.utils.validation import assert_not_none


class IndexableModule(Module[ConfigScope], ABC):
    allowed_mod_options: Set[str] = {"indices"}

    def get_dataset_split(self, name: Optional[DatasetSplitName] = None) -> Dataset:
        """Get the specified dataset_split, according to module indices.

        If indices are None, it gets the full dataset.

        Args:
            name: Which dataset_split to select.

        Returns:
            The loaded dataset_split.

        """
        dataset_split = self.get_full_dataset_split(name)
        indices = self.mod_options.indices
        if indices:
            dataset_split = dataset_split.select(indices)
        return dataset_split


class DatasetResultModule(IndexableModule[ConfigScope], ABC):
    @abstractmethod
    def _save_result(self, res: List[ModuleResponse], dm: DatasetSplitManager):
        raise NotImplementedError

    def save_result(self, res: List[ModuleResponse], dm: DatasetSplitManager):
        """Save results in a DatasetSplitManager or anywhere else.

        Args:
            res: Results from `compute_on_dataset_split`.
            dm: the dataset_split manager used to get `res`.

        """
        if len(res) != dm.num_rows:
            raise ValueError("The results length don't match the dataset size.")
        return self._save_result(res, dm)


class ModelContractModule(DatasetResultModule[ModelContractConfig], abc.ABC):
    allowed_mod_options: Set[str] = DatasetResultModule.allowed_mod_options | {
        "threshold",
        "pipeline_index",
        "model_contract_method_name",
    }

    def __init__(
        self,
        dataset_split_name: DatasetSplitName,
        config: ModelContractConfig,
        mod_options: Optional[ModuleOptions] = None,
    ):

        super().__init__(dataset_split_name, config, mod_options=mod_options)

        if self.model_contract_method_name is None:
            raise ValueError(
                "A model_contract_method_name needs to be provided for ModelContractModule"
            )

    def compute(self, batch: Dataset) -> List[ModuleResponse]:
        my_func = self.route_request(assert_not_none(self.model_contract_method_name))
        if my_func:
            res: List[ModuleResponse] = my_func(batch)
        return res

    def route_request(self, method_name: SupportedMethod) -> Callable:
        """Route the method_name to the correct fn.

        Args:
            method_name: Name of the supported method.

        Returns:
            Function associated to the method_name.

        Raises:
            Exception: If method_name is not a valid SupportedMethod.

        """
        if method_name == SupportedMethod.Inputs:
            return self.get_input
        elif method_name == SupportedMethod.Predictions:
            return self.predict
        elif method_name == SupportedMethod.Saliency:
            return self.saliency
        elif method_name == SupportedMethod.PostProcess:
            return self.post_process
        else:
            raise Exception("Method is not found")

    @abc.abstractmethod
    def get_input(self, batch: Dataset) -> List[InputResponse]:
        # Get the input to show properly in the application.
        ...

    @abc.abstractmethod
    def predict(self, batch: Dataset) -> List[PredictionResponse]:
        # Compute prediction on the batch.
        ...

    @abc.abstractmethod
    def post_process(self, batch: Dataset) -> List[PredictionResponse]:
        # Recompute post-processing on the batch based on new config attributes or mod_options.
        ...

    @abc.abstractmethod
    def saliency(self, batch: Dataset) -> List[SaliencyResponse]:
        # Compute saliency on the batch.
        ...

    def run_postprocessing(self, output: PostProcessingIO, **kwargs) -> List[PostprocessingStep]:
        """
        Run all postprocessors defined in `self.config` on a batch.

        Args:
            output: output of the model as a numpy array.
            kwargs: Additional arguments to the postprocessors.

        Returns:
            postprocessed output.

        Raises:
            ValueError when pipeline_index is not valid.
        """
        if self.mod_options.pipeline_index is None or self.config.pipelines is None:
            raise ValueError(
                f"Expected non-null Pipeline index (got {self.mod_options.pipeline_index})"
                f" and pipeline definitions (got {self.config.pipelines})."
            )
        postprocessors = self.config.pipelines[self.mod_options.pipeline_index].postprocessors
        postprocessing_steps = []
        if postprocessors is not None:
            for order, post in enumerate(postprocessors):
                # Q: Why do we reload the postprocessors all the time?
                # A: We should memoize it based on the module options, but that can get complicated.
                #    It is less burdensome to just reload it.
                fn = load_custom_object(post, **kwargs)
                output = fn(output)
                # When updating to python 3.9, use .removeprefix()
                class_name = (
                    post.class_name[32:]
                    if post.class_name.startswith("azimuth.utils.ml.postprocessing.")
                    else post.class_name
                )

                postprocessing_steps.append(
                    PostprocessingStep(
                        order=order,
                        class_name=class_name,
                        output=output,
                    )
                )
        return postprocessing_steps

    def _save_result(self, res, dm):
        if isinstance(res[0], PredictionResponse):
            # Save result in a DatasetSplitManager
            table_key = self._get_table_key()
            class_names = dm.get_class_names()
            res_casted = cast(List[PredictionResponse], res)
            dm.add_column_to_prediction_table(
                key=DatasetColumn.model_predictions,
                features=[
                    [cl_idx for cl_idx in reversed(np.argsort(pred_res.model_output.probs[0]))]
                    for pred_res in res_casted
                ],
                table_key=table_key,
            )
            dm.add_column_to_prediction_table(
                key=DatasetColumn.model_confidences,
                features=[
                    [prob for prob in reversed(np.sort(pred_res.model_output.probs[0]))]
                    for pred_res in res_casted
                ],
                table_key=table_key,
            )
            dm.add_column_to_prediction_table(
                key=DatasetColumn.postprocessed_prediction,
                features=[int(pred_res.postprocessed_output.preds[0]) for pred_res in res_casted],
                table_key=table_key,
            ),
            dm.add_column_to_prediction_table(
                key=DatasetColumn.postprocessed_confidences,
                features=[
                    [prob for prob in reversed(np.sort(pred_res.postprocessed_output.probs[0]))]
                    for pred_res in res_casted
                ],
                table_key=table_key,
            )
            dm.add_column_to_prediction_table(
                key=DatasetColumn.pipeline_steps,
                features=[
                    {
                        "preprocessing_steps": [
                            PreprocessingStepItem(
                                order=step.order, class_name=step.class_name, text=step.text[0]
                            ).dict()
                            for step in pred_res.preprocessing_steps
                        ],
                        "postprocessing_steps": [
                            PostprocessingStepItem(
                                order=step.order,
                                class_name=step.class_name,
                                output=PredictionDetails(
                                    predictions=[
                                        class_names[cl_idx]
                                        for cl_idx in reversed(np.argsort(step.output.probs[0]))
                                    ],
                                    prediction=class_names[step.output.preds[0]],
                                    confidences=[
                                        prob for prob in reversed(np.sort(step.output.probs[0]))
                                    ],
                                    outcome=compute_outcome(
                                        step.output.preds[0], pred_res.label, dm.rejection_class_idx
                                    ),
                                ),
                            ).dict()
                            for step in pred_res.postprocessing_steps
                        ],
                    }
                    for pred_res in res_casted
                ],
                table_key=table_key,
            )

            if table_key.use_bma:
                # Epistemic uncertainty is only computed when use_bma is set to True, hence why the
                # smart tag is only computed on that condition.
                high_epistemic = {
                    idx: {
                        SmartTag.high_epistemic_uncertainty: r.epistemic
                        > self.config.uncertainty.high_epistemic_threshold
                    }
                    for idx, r in enumerate(res_casted)
                }
                # We save the smart tag with use_bma=False so the smart tag can be retrieved in the
                # prediction table with the regular key, as the other tags.
                non_bma_table_key = dataclasses.replace(table_key, use_bma=False)
                dm.add_tags(high_epistemic, table_key=non_bma_table_key)
            else:
                # These tags only need to be computed for the prediction table with the regular key
                # (use_bma=False)
                pred_tags = self.get_pred_tags(
                    label=dm.get_dataset_split(table_key=table_key)[self.config.columns.label],
                    model_predictions=dm.get_dataset_split(table_key=table_key)[
                        DatasetColumn.model_predictions
                    ],
                    postprocessed_prediction=dm.get_dataset_split(table_key=table_key)[
                        DatasetColumn.postprocessed_prediction
                    ],
                )
                dm.add_tags(
                    {idx: pred_tag_row for idx, pred_tag_row in enumerate(pred_tags)},
                    table_key=table_key,
                )

    @staticmethod
    def get_pred_tags(
        label: List[int],
        model_predictions: List[List[int]],
        postprocessed_prediction: List[int],
    ) -> List[Dict[SmartTag, bool]]:
        """Compute the `correct_low_conf` and `correct_top_3` tags.
        `correct_low_conf` is set when the top prediction is correct but its confidence is below the
        threshold, so the prediction is set to the rejection class.
        `correct_top_3` is set when the top prediction is incorrect, but the label is in the top 3
        model_predictions (i.e., second or third).

        Args:
            label: List of labels per index.
            model_predictions: List of lists of all model_predictions per index.
            postprocessed_prediction: List of predictions after post-processing.

        Returns:
            tags: List (length equal to number of indices) of dictionaries where key is smart tag
                name and value is smart tag value.
        """
        tags = []

        for row_lab, row_preds, row_postproc_pred in zip(
            label, model_predictions, postprocessed_prediction
        ):
            correct_low_conf = correct_top_3 = False
            if row_postproc_pred != row_lab:
                correct_low_conf = row_preds[0] == row_lab
                correct_top_3 = (len(row_preds) > 3) and (row_lab in row_preds[1:3])
            tags.append(
                {SmartTag.correct_low_conf: correct_low_conf, SmartTag.correct_top_3: correct_top_3}
            )

        return tags
