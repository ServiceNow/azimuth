# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from collections import defaultdict
from typing import Dict

import datasets
import numpy as np
import pytest

from azimuth.config import MetricDefinition
from azimuth.modules.model_contracts import HFTextClassificationModule
from azimuth.modules.model_performance.metrics import (
    MetricsModule,
    MetricsPerFilterModule,
)
from azimuth.modules.model_performance.outcome_count import (
    OutcomeCountPerFilterModule,
    OutcomeCountPerThresholdModule,
)
from azimuth.modules.model_performance.outcomes import OutcomesModule
from azimuth.plots.ece import make_ece_figure
from azimuth.types import (
    DatasetFilters,
    DatasetSplitName,
    ModuleOptions,
    SupportedMethod,
)
from azimuth.types.outcomes import OutcomeName
from azimuth.types.tag import ALL_DATA_ACTIONS, ALL_SMART_TAGS, DataAction, SmartTag


def test_metrics(simple_text_config):
    pred_mod = HFTextClassificationModule(
        dataset_split_name=DatasetSplitName.eval,
        config=simple_text_config,
        mod_options=ModuleOptions(
            pipeline_index=0, model_contract_method_name=SupportedMethod.Predictions
        ),
    )
    pred_res = pred_mod.compute_on_dataset_split()
    dm = pred_mod.get_dataset_split_manager()
    pred_mod.save_result(pred_res, dm)

    outcomes_mod = OutcomesModule(
        dataset_split_name=DatasetSplitName.eval,
        config=simple_text_config,
        mod_options=ModuleOptions(pipeline_index=0),
    )
    outcomes_res = outcomes_mod.compute_on_dataset_split()
    dm = outcomes_mod.get_dataset_split_manager()
    outcomes_mod.save_result(outcomes_res, dm)

    metrics_mod = MetricsModule(
        dataset_split_name=DatasetSplitName.eval,
        config=simple_text_config,
        mod_options=ModuleOptions(pipeline_index=0),
    )

    ds = metrics_mod.get_dataset_split()
    [metrics_res] = metrics_mod.compute_on_dataset_split()

    assert 0.0 <= metrics_res.ece <= 1.0
    assert "data" in make_ece_figure(*metrics_res.ece_plot_args)

    assert metrics_res.utterance_count == len(ds)

    # Check that outcome count match utterance count
    assert sum(metrics_res.outcome_count.values()) == len(ds)

    # Changing the filters change the values.
    metrics_mod_2 = MetricsModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(filters=DatasetFilters(predictions=[1]), pipeline_index=0),
    )
    [metrics_res_2] = metrics_mod_2.compute_on_dataset_split()

    ds = metrics_mod_2.get_dataset_split()
    assert metrics_res_2.utterance_count == len(ds)


def test_outcomes(file_text_config_no_intent):
    # Using file_text_config_no_intent since we know the predicted classes for each utterance.

    mod = OutcomesModule(
        DatasetSplitName.eval,
        file_text_config_no_intent,
        mod_options=ModuleOptions(pipeline_index=0),
    )
    res = mod.compute_on_dataset_split()

    # Outcome determined from the values in sample_predictions_top1.csv
    assert res == [
        OutcomeName.CorrectAndRejected,
        OutcomeName.CorrectAndRejected,
        OutcomeName.CorrectAndPredicted,
        OutcomeName.IncorrectAndPredicted,
        OutcomeName.CorrectAndRejected,
        OutcomeName.IncorrectAndRejected,
    ]


def test_empty_ds(simple_text_config, dask_client):
    mod = MetricsModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(filters=DatasetFilters(labels=[42]), pipeline_index=0),
    )
    _ = mod.get_dataset_split()
    [json_output] = mod.compute_on_dataset_split()
    # Nothing is there, but the response works.
    assert json_output.ece == 0
    assert json_output.utterance_count == 0


def test_outcome_count_per_threshold(tiny_text_config, dask_client):
    nb_bins = 3
    mod = OutcomeCountPerThresholdModule(
        dataset_split_name=DatasetSplitName.eval,
        config=tiny_text_config,
        mod_options=ModuleOptions(nb_bins=nb_bins, pipeline_index=0),
    )
    num_rows = mod.get_dataset_split().num_rows
    [result] = mod.compute_on_dataset_split()
    assert len(result.outcome_count_all_thresholds) == nb_bins
    assert all(
        sum(rg_per_th.outcome_count.values()) == num_rows
        for rg_per_th in result.outcome_count_all_thresholds
    )

    # Check that outcomes change by threshold
    outcomes_for_all_threshold = defaultdict(list)
    for rg_per_th in result.outcome_count_all_thresholds:
        outcomes_for_all_threshold[OutcomeName.IncorrectAndRejected].append(
            rg_per_th.outcome_count.get(OutcomeName.IncorrectAndRejected, 0)
        )
        outcomes_for_all_threshold[OutcomeName.IncorrectAndPredicted].append(
            rg_per_th.outcome_count.get(OutcomeName.IncorrectAndPredicted, 0)
        )
        outcomes_for_all_threshold[OutcomeName.CorrectAndPredicted].append(
            rg_per_th.outcome_count.get(OutcomeName.CorrectAndPredicted, 0)
        )
        outcomes_for_all_threshold[OutcomeName.CorrectAndRejected].append(
            rg_per_th.outcome_count.get(OutcomeName.CorrectAndRejected, 0)
        )
    assert not all(len(set(counts)) == 1 for counts in outcomes_for_all_threshold.values())


def test_outcome_count_per_filter(simple_text_config, apply_mocked_startup_task):
    mod = OutcomeCountPerFilterModule(
        DatasetSplitName.eval,
        config=simple_text_config,
        mod_options=ModuleOptions(pipeline_index=0),
    )

    [res] = mod.compute_on_dataset_split()

    mod_filter_0 = OutcomeCountPerFilterModule(
        DatasetSplitName.eval,
        config=simple_text_config,
        mod_options=ModuleOptions(filters=DatasetFilters(labels=[0]), pipeline_index=0),
    )

    [res_filter_0] = mod_filter_0.compute_on_dataset_split()

    dm = mod.get_dataset_split_manager()

    # Assert the class name associated with rejection_class
    # is first (in this case, it will be one of the two classes)
    assert (
        res.count_per_filter.label[0].filter_value
        == res_filter_0.count_per_filter.label[0].filter_value
        == dm.get_class_names()[dm.rejection_class_idx]
    )
    assert (
        res.count_per_filter.prediction[0].filter_value
        == res_filter_0.count_per_filter.prediction[0].filter_value
        == dm.get_class_names()[dm.rejection_class_idx]
    )
    assert (
        res.count_per_filter.smart_tag[0].filter_value
        == res_filter_0.count_per_filter.smart_tag[0].filter_value
        == SmartTag.no_smart_tag
    )
    assert (
        res.count_per_filter.data_action[0].filter_value
        == res_filter_0.count_per_filter.data_action[0].filter_value
        == DataAction.no_action
    )
    # Assert that for one of the 2 classes, the total will be the same in both results.
    assert any(
        res.count_per_filter.label[x].utterance_count
        == res_filter_0.count_per_filter.label[x].utterance_count
        for x in [0, 1]
    )
    # Assert that for one of the 2 classes, the total will be 0 for the second results.
    assert any(res_filter_0.count_per_filter.label[x].utterance_count == 0 for x in [0, 1])


def test_metrics_per_filter(tiny_text_config, apply_mocked_startup_task):
    apply_mocked_startup_task(tiny_text_config)
    mf_module = MetricsPerFilterModule(
        dataset_split_name=DatasetSplitName.eval,
        config=tiny_text_config,
        mod_options=ModuleOptions(pipeline_index=0),
    )
    [result] = mf_module.compute_on_dataset_split()
    ds_len = len(mf_module.get_dataset_split())
    dm = mf_module.get_dataset_split_manager()

    assert result.utterance_count == ds_len
    prediction_metrics = result.metrics_per_filter.prediction
    assert sum([mf_v.utterance_count for mf_v in prediction_metrics]) == ds_len
    assert len(prediction_metrics) == dm.get_num_classes()

    label_metrics = result.metrics_per_filter.label
    assert sum([mf_v.utterance_count for mf_v in label_metrics]) == ds_len
    assert len(label_metrics) == dm.get_num_classes()

    smart_tag_metrics = result.metrics_per_filter.smart_tag
    assert sum([mf_v.utterance_count for mf_v in smart_tag_metrics]) == ds_len
    assert len(smart_tag_metrics) == len(ALL_SMART_TAGS)

    data_action_metrics = result.metrics_per_filter.data_action
    assert sum([mf_v.utterance_count for mf_v in data_action_metrics]) == ds_len
    assert len(data_action_metrics) == len(ALL_DATA_ACTIONS)

    outcome_metrics = result.metrics_per_filter.outcome
    assert sum([mf_v.utterance_count for mf_v in outcome_metrics]) == ds_len
    assert len(outcome_metrics) == 4


_CITATION = """\
"""

_DESCRIPTION = """
Very cool metric that returns the ratio of high confidence items.
"""

_KWARGS_DESCRIPTION = """
Args:
    predictions: Predicted classes [num_samples].
    references: Targets to be matched [num_samples].
    sum: Whether to sum the per-class perc deflected metric or not.
Returns:
    'value':
"""


class MyMetric(datasets.Metric):
    def _info(self) -> datasets.MetricInfo:
        return datasets.MetricInfo(
            description=_DESCRIPTION,
            citation=_CITATION,
            inputs_description=_KWARGS_DESCRIPTION,
            features=datasets.Features(
                {
                    "predictions": datasets.Value("int64"),
                    "references": datasets.Value("int64"),
                }
            ),
        )

    def _compute(
        self,
        predictions: np.ndarray,
        references: np.ndarray,
        probabilities: np.ndarray,
        threshold: float = 0.8,
    ) -> Dict[str, float]:
        return {"value": (probabilities.max(-1) > threshold).sum() / len(probabilities)}


@pytest.mark.parametrize("threshold", [0.8, 0.99])
def test_custom_metrics(simple_text_config, apply_mocked_startup_task, threshold):
    simple_text_config.metrics["MyMetric"] = MetricDefinition(
        class_name="tests.test_modules.test_model_performance.test_metrics.MyMetric",
        additional_kwargs={"threshold": threshold},
    )
    metric_module = MetricsModule(
        dataset_split_name=DatasetSplitName.eval, config=simple_text_config
    )
    out = metric_module.compute_on_dataset_split()[0]
    confidences = np.array(metric_module.get_dataset_split()["postprocessed_confidences"])
    ratio_high_confidence = (confidences.max(-1) > threshold).sum() / len(confidences)

    assert out.custom_metrics["MyMetric"] == ratio_high_confidence
