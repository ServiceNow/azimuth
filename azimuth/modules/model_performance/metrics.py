# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
import inspect
import json
import warnings
from collections import Counter
from typing import Dict, List, Optional

import numpy as np
from datasets import Dataset, Metric
from sklearn.exceptions import UndefinedMetricWarning
from tqdm import tqdm

from azimuth.config import AzimuthConfig, ModelContractConfig
from azimuth.modules.base_classes import AggregationModule, FilterableModule
from azimuth.modules.model_performance.confidence_binning import (
    ConfidenceHistogramModule,
)
from azimuth.plots.ece import make_ece_figure
from azimuth.types import DatasetColumn, DatasetFilters
from azimuth.types.model_performance import (
    MetricsAPIResponse,
    MetricsModuleResponse,
    MetricsPerFilter,
    MetricsPerFilterModuleResponse,
    MetricsPerFilterValue,
)
from azimuth.types.outcomes import ALL_OUTCOMES
from azimuth.types.tag import (
    ALL_DATA_ACTION_FILTERS,
    SMART_TAGS_FAMILY_MAPPING,
    SmartTag,
    SmartTagFamily,
)
from azimuth.utils.dataset_operations import (
    filter_dataset_split,
    get_confidences_from_ds,
    get_outcomes_from_ds,
    get_predictions_from_ds,
)
from azimuth.utils.ml.ece import compute_ece_from_bins
from azimuth.utils.ml.model_performance import sorted_by_utterance_count_with_last
from azimuth.utils.validation import assert_not_none

MAX_PRED = 3

BASE_RESPONSE = MetricsModuleResponse(
    outcome_count={outcome: 0 for outcome in ALL_OUTCOMES},
    ece=0.0,
    ece_plot_args=None,
    utterance_count=0,
    custom_metrics={},
)


def first_value(di: Optional[Dict]) -> Optional[float]:
    if di is None:
        return None
    # Get first value of a dict.
    return next(iter(di.values()), None)


class MetricsModule(FilterableModule[ModelContractConfig]):
    """Computes different metrics on each dataset split."""

    def compute_metrics(self, ds: Dataset) -> List[MetricsModuleResponse]:
        """Compute all metrics on the specified dataset split.

        Note: This lives outside of `compute_on_dataset_split()` so that it can be called without
        going through calling the module and filtering the dataset.

        Args:
            ds: Dataset Split for which to compute metrics.

        Returns:
            MetricsModuleResponse with all metrics.
        """
        if len(ds) == 0:
            # Nothing to do, we return an empty response.
            return [BASE_RESPONSE]
        else:
            utterance_count = len(ds)
            outcome_count = Counter(
                get_outcomes_from_ds(ds, self.mod_options.without_postprocessing)
            )
            outcome_count.update({outcome: 0 for outcome in ALL_OUTCOMES})

            # Compute ECE
            bins = ConfidenceHistogramModule.get_bins(ds, self.mod_options.without_postprocessing)
            ece, acc, expected = compute_ece_from_bins(bins)
            count_per_bin = [sum(b.outcome_count.values()) for b in bins]

            metric_values = {}
            dm = self.get_dataset_split_manager()
            for metric_name, metric_obj_def in self.config.metrics.items():
                met: Metric = self.artifact_manager.get_metric(
                    self.config,
                    metric_name,
                    label_list=dm.get_class_names(),
                    rejection_class_idx=dm.rejection_class_idx,
                    force_kwargs=True,  # Set True here as load_metrics has **kwargs.
                )
                accept_probabilities = "probabilities" in inspect.signature(met._compute).parameters
                extra_kwargs = (
                    dict(probabilities=self.make_probabilities()) if accept_probabilities else {}
                )
                extra_kwargs.update(metric_obj_def.additional_kwargs)
                with warnings.catch_warnings():
                    # Ignore warnings such as
                    #   UndefinedMetricWarning: Precision is ill-defined and being set to 0.0
                    warnings.simplefilter("ignore", category=UndefinedMetricWarning)
                    metric_values[metric_name] = assert_not_none(
                        first_value(
                            met.compute(
                                predictions=get_predictions_from_ds(
                                    ds, self.mod_options.without_postprocessing
                                ),
                                references=ds[self.config.columns.label],
                                **extra_kwargs,
                            )
                        )
                    )

            return [
                MetricsModuleResponse(
                    outcome_count=outcome_count,
                    ece=ece,
                    ece_plot_args=(acc, expected, ece, count_per_bin),
                    utterance_count=utterance_count,
                    custom_metrics=metric_values,
                )
            ]

    def compute_on_dataset_split(self) -> List[MetricsModuleResponse]:  # type: ignore
        """Computes different metrics according to the specified module options."""
        ds: Dataset = assert_not_none(self.get_dataset_split())
        return self.compute_metrics(ds)

    @staticmethod
    def module_to_api_response(res: List[MetricsModuleResponse]) -> List[MetricsAPIResponse]:
        """Converts the module response in what the API route needs to return.

        In this module, the module response contains the plot args which are used to build the plot.
        The plot is returned in the API.

        Args:
            res: Module response.

        Returns:
            API response.

        """
        metrics_res = res[0]
        plot_args = metrics_res.ece_plot_args
        fig = plot_args and json.loads(make_ece_figure(*plot_args).to_json())
        res_with_plot = MetricsAPIResponse(**metrics_res.dict(), ece_plot=fig)
        return [res_with_plot]

    def make_probabilities(self) -> np.ndarray:
        """Make probabilities from dataset columns.

        Returns:
            Array with shape [len(dataset), num_classes] with probabilities.
        """
        ds = self.get_dataset_split()
        num_classes = self.get_dataset_split_manager().get_num_classes(labels_only=True)

        probs = np.zeros([len(ds), num_classes])
        for idx, (confidences, predictions) in enumerate(
            zip(
                get_confidences_from_ds(ds, self.mod_options.without_postprocessing),
                ds[DatasetColumn.model_predictions],
            )
        ):
            probs[idx] = np.array(confidences)[predictions]
        return probs


class MetricsPerFilterModule(AggregationModule[AzimuthConfig]):
    """Computes the metrics for each filter."""

    def get_metrics_for_filter(
        self, filters_dict: Dict[str, DatasetFilters]
    ) -> List[MetricsPerFilterValue]:
        """Get metrics for a list of filters.

        Args:
            filters_dict: Dictionary with filter values as keys
                and the corresponding dataset filters as values.

        Returns:
            Metrics for all provided filters.
        """
        ds = self.get_dataset_split()
        accumulator = []
        for filter_value, filters in filters_dict.items():
            ds_filtered = filter_dataset_split(ds, filters, config=self.config)
            metric = MetricsModule(
                dataset_split_name=self.dataset_split_name,
                config=self.config,
            ).compute_metrics(ds_filtered)[0]
            accumulator.append(MetricsPerFilterValue(**metric.dict(), filter_value=filter_value))
        return accumulator

    def compute_on_dataset_split(self) -> List[MetricsPerFilterModuleResponse]:  # type: ignore
        dm = self.get_dataset_split_manager()
        ds = self.get_dataset_split()

        with tqdm(total=5) as pbar:
            pbar.set_description(
                f"MetricsPerFilter on {self.dataset_split_name} "
                f"set for pipeline {self.mod_options.pipeline_index}"
            )

            label_filters = {
                class_name: self.edit_filter(self.mod_options.filters, label=i)
                for i, class_name in enumerate(dm.get_class_names())
            }
            metrics_per_label = sorted_by_utterance_count_with_last(
                self.get_metrics_for_filter(label_filters), dm.rejection_class_idx
            )
            pbar.update()

            prediction_filters = {
                class_name: self.edit_filter(self.mod_options.filters, prediction=i)
                for i, class_name in enumerate(dm.get_class_names())
            }
            metrics_per_prediction = sorted_by_utterance_count_with_last(
                self.get_metrics_for_filter(prediction_filters),
                dm.rejection_class_idx,
            )
            pbar.update()

            data_action_filters = {
                data_action: self.edit_filter(self.mod_options.filters, data_action=data_action)
                for data_action in ALL_DATA_ACTION_FILTERS
            }
            metrics_per_data_action = sorted_by_utterance_count_with_last(
                self.get_metrics_for_filter(data_action_filters),
                -1,
            )
            pbar.update()

            smart_tag_filters: Dict[SmartTagFamily, Dict[str, DatasetFilters]] = {
                tag_family: {
                    smart_tag: self.edit_filter(
                        self.mod_options.filters, smart_tag={tag_family: [smart_tag]}
                    )
                    for smart_tag in tags + [SmartTag.no_smart_tag]
                }
                for tag_family, tags in SMART_TAGS_FAMILY_MAPPING.items()
            }
            metrics_per_smart_tag = {
                tag_family.value: sorted_by_utterance_count_with_last(
                    self.get_metrics_for_filter(filters_for_family), -1
                )
                for tag_family, filters_for_family in smart_tag_filters.items()
            }
            pbar.update()

            outcomes_filters: Dict[str, DatasetFilters] = {
                outcome: self.edit_filter(self.mod_options.filters, outcome=outcome)
                for outcome in ALL_OUTCOMES
            }
            metrics_per_outcome = self.get_metrics_for_filter(outcomes_filters)
            pbar.update()

        return [
            MetricsPerFilterModuleResponse(
                metrics_per_filter=MetricsPerFilter(
                    label=metrics_per_label,
                    prediction=metrics_per_prediction,
                    data_action=metrics_per_data_action,
                    **metrics_per_smart_tag,
                    outcome=metrics_per_outcome,
                ),
                utterance_count=len(ds),
            )
        ]

    def edit_filter(
        self,
        initial_filter: DatasetFilters,
        label=None,
        prediction=None,
        data_action=None,
        outcome=None,
        smart_tag=None,
    ):
        """Edit filters to include an update set.

        Args:
            initial_filter: Filter to edit.
            label: label to add to the filters
            prediction: prediction to add to the filters
            data_action: data_action to add to the filters
            outcome: outcome to add to the filters
            smart_tag: smart_tag to add to the filters

        Returns:
            An updated version of the filter.
        """
        filter_copy = initial_filter.copy(deep=True)
        if label is not None:
            filter_copy.label.append(label)
        if prediction is not None:
            filter_copy.prediction.append(prediction)
        if data_action is not None:
            filter_copy.data_action.append(data_action)
        if outcome is not None:
            filter_copy.outcome.append(outcome)
        if smart_tag is not None:
            filter_copy.smart_tags.update(smart_tag)
        return filter_copy
