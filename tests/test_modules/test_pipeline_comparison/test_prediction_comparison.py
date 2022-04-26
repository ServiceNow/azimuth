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

    for pred_0, pred_1, tags in zip(predictions_0, predictions_1, result):
        pred_cls_0, pred_cls_1 = (
            pred_0.postprocessed_output.preds.item(),
            pred_1.postprocessed_output.preds.item(),
        )

        assert tags.one_model_disagrees == (pred_cls_0 != pred_cls_1)
        assert tags.all_models_wrong == (pred_cls_0 != pred_0.label and pred_cls_1 != pred_1.label)


def test_less_than_two_pipeline(simple_text_config, simple_no_pipeline_text_config):
    for cfg in (simple_text_config, simple_no_pipeline_text_config):
        module = PredictionComparisonModule(
            dataset_split_name=DatasetSplitName.eval,
            config=cfg,
        )
        result = module.compute_on_dataset_split()
        assert not any(tags.one_model_disagrees or tags.all_models_wrong for tags in result)


def test_save_results(simple_multipipeline_text_config):
    module = PredictionComparisonModule(
        dataset_split_name=DatasetSplitName.eval, config=simple_multipipeline_text_config
    )
    dm = module.get_dataset_split_manager()
    preds = [
        PredictionComparisonResponse(one_model_disagrees=i < 10, all_models_wrong=i < 15)
        for i in range(dm.num_rows)
    ]
    module.save_result(preds, dm)
    assert SmartTag.one_model_disagrees not in dm.get_dataset_split(None)
    assert SmartTag.all_models_wrong not in dm.get_dataset_split(None)

    # Check that the tag is applied to all prediction tables.
    for pipeline_index in range(len(simple_multipipeline_text_config.pipelines)):
        table_key = PredictionTableKey.from_pipeline_index(
            pipeline_index, simple_multipipeline_text_config
        )
        ds = dm.get_dataset_split(table_key)
        assert (
            sum(ds[SmartTag.one_model_disagrees]) == 10 and sum(ds[SmartTag.all_models_wrong]) == 15
        )
