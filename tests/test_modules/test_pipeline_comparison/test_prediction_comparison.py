import pytest

from azimuth.dataset_split_manager import PredictionTableKey
from azimuth.modules.pipeline_comparison.prediction_comparison import (
    PredictionComparisonModule,
)
from azimuth.types import DatasetSplitName
from azimuth.types.pipeline_comparison import PredictionComparisonResponse
from azimuth.types.tag import SmartTag


def test_response(simple_multipipeline_text_config):
    module = PredictionComparisonModule(
        dataset_split_name=DatasetSplitName.eval,
        config=simple_multipipeline_text_config,
    )
    result = module.compute_on_dataset_split()
    predictions_0 = module._get_predictions(0)
    predictions_1 = module._get_predictions(1)
    assert any(tags.pipeline_disagreement for tags in result)
    assert any(tags.incorrect_for_all_pipelines for tags in result)

    for pred_0, pred_1, tags in zip(predictions_0, predictions_1, result):
        pred_cls_0, pred_cls_1 = (
            pred_0.postprocessed_output.preds.item(),
            pred_1.postprocessed_output.preds.item(),
        )

        assert tags.pipeline_disagreement == (pred_cls_0 != pred_cls_1), (pred_cls_0, pred_cls_1)
        assert tags.incorrect_for_all_pipelines == (
            pred_cls_0 != pred_0.label and pred_cls_1 != pred_1.label
        )


def test_less_than_two_pipeline(simple_text_config, simple_no_pipeline_text_config):
    for cfg in (simple_text_config, simple_no_pipeline_text_config):
        module = PredictionComparisonModule(
            dataset_split_name=DatasetSplitName.eval,
            config=cfg,
        )
        with pytest.raises(ValueError, match="less than two pipelines"):
            module.compute_on_dataset_split()


def test_save_results(simple_multipipeline_text_config):
    module = PredictionComparisonModule(
        dataset_split_name=DatasetSplitName.eval, config=simple_multipipeline_text_config
    )
    dm = module.get_dataset_split_manager()
    preds = [
        PredictionComparisonResponse(
            pipeline_disagreement=i < 10, incorrect_for_all_pipelines=i < 15
        )
        for i in range(dm.num_rows)
    ]
    module.save_result(preds, dm)
    assert SmartTag.pipeline_disagreement not in dm.get_dataset_split(None)
    assert SmartTag.incorrect_for_all_pipelines not in dm.get_dataset_split(None)

    # Check that the tag is applied to all prediction tables.
    for pipeline_index in range(len(simple_multipipeline_text_config.pipelines)):
        table_key = PredictionTableKey.from_pipeline_index(
            pipeline_index, simple_multipipeline_text_config
        )
        ds = dm.get_dataset_split(table_key)
        assert (
            sum(ds[SmartTag.pipeline_disagreement]) == 10
            and sum(ds[SmartTag.incorrect_for_all_pipelines]) == 15
        )
