# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from collections import defaultdict
from typing import Dict

import datasets
import numpy as np
import pytest

from azimuth.config import MetricDefinition
from azimuth.modules.model_performance.metrics import MetricsModule, MetricsPerFilterModule
from azimuth.modules.model_performance.outcome_count import (
    OutcomeCountPerFilterModule,
    OutcomeCountPerThresholdModule,
)
from azimuth.modules.model_performance.outcomes import OutcomesModule
from azimuth.plots.ece import make_ece_figure
from azimuth.types import DatasetFilters, DatasetSplitName, ModuleOptions
from azimuth.types.outcomes import OutcomeName, OutcomeResponse
from azimuth.types.tag import SMART_TAGS_FAMILY_MAPPING, DataAction, SmartTag
from tests.utils import save_outcomes, save_predictions


def test_metrics(tiny_text_config):
    save_predictions(tiny_text_config)
    save_outcomes(tiny_text_config)

    metrics_mod = MetricsModule(
        dataset_split_name=DatasetSplitName.eval,
        config=tiny_text_config,
        mod_options=ModuleOptions(pipeline_index=0),
    )

    ds = metrics_mod.get_dataset_split()
    [metrics_res] = metrics_mod.compute_on_dataset_split()

    assert 0.0 <= metrics_res.ece <= 1.0
    assert "data" in make_ece_figure(*metrics_res.ece_plot_args)

    assert metrics_res.utterance_count == len(ds)

    # Check that outcome count match utterance count
    assert sum(metrics_res.outcome_count.values()) == len(ds)
    # Check that outcome and accuracy are close.
    assert np.isclose(
        metrics_res.custom_metrics["Accuracy"],
        metrics_res.outcome_count[OutcomeName.CorrectAndPredicted]
        + metrics_res.outcome_count[OutcomeName.CorrectAndRejected] / len(ds),
    )

    # Changing the filters changes the values.
    metrics_mod_filters = MetricsModule(
        DatasetSplitName.eval,
        tiny_text_config,
        mod_options=ModuleOptions(filters=DatasetFilters(prediction=[1]), pipeline_index=0),
    )
    [metrics_res_filters] = metrics_mod_filters.compute_on_dataset_split()

    ds = metrics_mod_filters.get_dataset_split()
    assert metrics_res_filters.utterance_count == len(ds)

    # Disabling postprocessing changes the values
    metrics_mod_post = MetricsModule(
        DatasetSplitName.eval,
        tiny_text_config,
        mod_options=ModuleOptions(pipeline_index=0, without_postprocessing=True),
    )
    [metrics_res_post] = metrics_mod_post.compute_on_dataset_split()

    assert metrics_res_post.ece != metrics_res.ece
    assert metrics_res_post.outcome_count.values() != metrics_res.outcome_count.values()
    assert metrics_res_post.custom_metrics["Precision"] != metrics_res.custom_metrics["Precision"]
    assert metrics_res_post.custom_metrics["Recall"] != metrics_res.custom_metrics["Recall"]


def test_outcomes(file_text_config_no_intent):
    # Using file_text_config_no_intent since we know the predicted classes for each utterance.

    mod = OutcomesModule(
        DatasetSplitName.eval,
        file_text_config_no_intent,
        mod_options=ModuleOptions(pipeline_index=0),
    )
    res = mod.compute_on_dataset_split()

    # Outcome determined from the values in sample_predictions_top1.csv
    # Results are the same with and without postprocessing with File-based.
    assert res == [
        OutcomeResponse(
            model_outcome=OutcomeName.CorrectAndRejected,
            postprocessed_outcome=OutcomeName.CorrectAndRejected,
        ),
        OutcomeResponse(
            model_outcome=OutcomeName.CorrectAndRejected,
            postprocessed_outcome=OutcomeName.CorrectAndRejected,
        ),
        OutcomeResponse(
            model_outcome=OutcomeName.CorrectAndPredicted,
            postprocessed_outcome=OutcomeName.CorrectAndPredicted,
        ),
        OutcomeResponse(
            model_outcome=OutcomeName.IncorrectAndPredicted,
            postprocessed_outcome=OutcomeName.IncorrectAndPredicted,
        ),
        OutcomeResponse(
            model_outcome=OutcomeName.CorrectAndRejected,
            postprocessed_outcome=OutcomeName.CorrectAndRejected,
        ),
        OutcomeResponse(
            model_outcome=OutcomeName.IncorrectAndRejected,
            postprocessed_outcome=OutcomeName.IncorrectAndRejected,
        ),
    ]


def test_empty_ds(tiny_text_config):
    mod = MetricsModule(
        DatasetSplitName.eval,
        tiny_text_config,
        mod_options=ModuleOptions(filters=DatasetFilters(label=[42]), pipeline_index=0),
    )
    _ = mod.get_dataset_split()
    [json_output] = mod.compute_on_dataset_split()
    # Nothing is there, but the response works.
    assert json_output.ece == 0
    assert json_output.utterance_count == 0


def test_outcome_count_per_threshold(tiny_text_config):
    x_ticks_count = 4
    mod = OutcomeCountPerThresholdModule(
        dataset_split_name=DatasetSplitName.eval,
        config=tiny_text_config,
        mod_options=ModuleOptions(x_ticks_count=x_ticks_count, pipeline_index=0),
    )
    num_rows = mod.get_dataset_split().num_rows
    [result] = mod.compute_on_dataset_split()
    assert len(result.outcome_count_per_threshold) == x_ticks_count
    assert all(
        sum(rg_per_th.outcome_count.values()) == num_rows
        for rg_per_th in result.outcome_count_per_threshold
    )

    # Check that outcomes change by threshold
    outcomes_for_all_threshold = defaultdict(list)
    for rg_per_th in result.outcome_count_per_threshold:
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


def test_outcome_count_per_filter(tiny_text_config):
    save_predictions(tiny_text_config)
    save_outcomes(tiny_text_config)

    mod = OutcomeCountPerFilterModule(
        DatasetSplitName.eval,
        config=tiny_text_config,
        mod_options=ModuleOptions(pipeline_index=0),
    )

    [res] = mod.compute_on_dataset_split()

    mod_filter_0 = OutcomeCountPerFilterModule(
        DatasetSplitName.eval,
        config=tiny_text_config,
        mod_options=ModuleOptions(filters=DatasetFilters(label=[0]), pipeline_index=0),
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
        res.count_per_filter.extreme_length[0].filter_value
        == res_filter_0.count_per_filter.extreme_length[0].filter_value
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

    mod_post = OutcomeCountPerFilterModule(
        DatasetSplitName.eval,
        config=tiny_text_config,
        mod_options=ModuleOptions(pipeline_index=0, without_postprocessing=True),
    )

    [res_post] = mod_post.compute_on_dataset_split()

    # Assert results are different without postprocessing
    assert res_post.count_per_filter.data_action != res.count_per_filter.data_action
    assert res_post.count_per_filter.label != res.count_per_filter.label
    assert res_post.count_per_filter.outcome != res.count_per_filter.outcome
    assert res_post.count_per_filter.prediction != res.count_per_filter.prediction
    assert res_post.count_per_filter.extreme_length != res.count_per_filter.extreme_length


def test_outcome_count_per_filter_without_postprocessing(tiny_text_config):
    save_predictions(tiny_text_config)
    save_outcomes(tiny_text_config)

    [res] = OutcomeCountPerFilterModule(
        DatasetSplitName.eval,
        config=tiny_text_config,
        mod_options=ModuleOptions(
            filters=DatasetFilters(outcome=[OutcomeName.IncorrectAndRejected]), pipeline_index=0
        ),
    ).compute_on_dataset_split()
    for per_outcome in res.count_per_filter.outcome:
        if per_outcome.filter_value != OutcomeName.IncorrectAndRejected:
            assert per_outcome.utterance_count == 0, f"expected no {per_outcome.filter_value}"
        else:
            assert per_outcome.utterance_count > 0, (
                f"expected some {per_outcome.filter_value},"
                "otherwise the following test doesn't test much"
            )

    # Regression test for bug https://github.com/ServiceNow/azimuth/issues/195
    # If we pass without_postprocessing to the modules, but we forget to propagate it in
    # FilterableModule.get_dataset_split(), utterances are mistakenly filtered based on their
    # post-processed outcome, but then the response is counted using the model outcome. Here, some
    # utterances that were IncorrectAndRejected with post-processing would be counted as a different
    # model outcome. We verify that the counts are still 0 for the other outcomes.
    [res_without_postprocessing] = OutcomeCountPerFilterModule(
        DatasetSplitName.eval,
        config=tiny_text_config,
        mod_options=ModuleOptions(
            filters=DatasetFilters(outcome=[OutcomeName.IncorrectAndRejected]),
            pipeline_index=0,
            without_postprocessing=True,
        ),
    ).compute_on_dataset_split()
    for per_outcome in res_without_postprocessing.count_per_filter.outcome:
        if per_outcome.filter_value != OutcomeName.IncorrectAndRejected:
            assert per_outcome.utterance_count == 0, f"expected no {per_outcome.filter_value}"


def test_metrics_per_filter(tiny_text_config, apply_mocked_startup_task):
    apply_mocked_startup_task(tiny_text_config)
    mf_module = MetricsPerFilterModule(
        dataset_split_name=DatasetSplitName.eval,
        config=tiny_text_config,
        mod_options=ModuleOptions(pipeline_index=0),
    )
    [result] = mf_module.compute_on_dataset_split()
    ds_len = len(mf_module.get_dataset_split())
    num_classes = mf_module.get_dataset_split_manager().get_num_classes()

    assert result.utterance_count == ds_len
    prediction_metrics = result.metrics_per_filter.prediction
    assert sum([mf_v.utterance_count for mf_v in prediction_metrics]) == ds_len
    assert len(prediction_metrics) == num_classes

    label_metrics = result.metrics_per_filter.label
    assert sum([mf_v.utterance_count for mf_v in label_metrics]) == ds_len
    assert len(label_metrics) == num_classes

    for family, smart_tags in SMART_TAGS_FAMILY_MAPPING.items():
        smart_tag_metrics = getattr(result.metrics_per_filter, family.value)
        assert sum([mf_v.utterance_count for mf_v in smart_tag_metrics]) == ds_len
        assert len(smart_tag_metrics) == len(smart_tags) + 1


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
        dataset_split_name=DatasetSplitName.eval,
        config=simple_text_config,
        mod_options=ModuleOptions(pipeline_index=0),
    )
    out = metric_module.compute_on_dataset_split()[0]
    confidences = np.array(metric_module.get_dataset_split()["postprocessed_confidences"])
    ratio_high_confidence = (confidences.max(-1) > threshold).sum() / len(confidences)

    assert out.custom_metrics["MyMetric"] == ratio_high_confidence
