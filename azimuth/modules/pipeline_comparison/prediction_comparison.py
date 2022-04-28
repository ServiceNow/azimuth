from typing import List

from azimuth.config import ModelContractConfig
from azimuth.dataset_split_manager import DatasetSplitManager, PredictionTableKey
from azimuth.modules.base_classes import DatasetResultModule
from azimuth.modules.model_contract_task_mapping import model_contract_task_mapping
from azimuth.modules.task_execution import get_task_result
from azimuth.types import ModuleOptions, SupportedMethod
from azimuth.types.pipeline_comparison import PredictionComparisonResponse
from azimuth.types.tag import SmartTag
from azimuth.types.task import PredictionResponse
from azimuth.utils.validation import assert_not_none


class PredictionComparisonModule(DatasetResultModule[ModelContractConfig]):
    def compute_on_dataset_split(self) -> List[PredictionComparisonResponse]:  # type: ignore
        self._validate_config()
        num_pipelines = len(assert_not_none(self.config.pipelines))
        preds_per_pipeline = [
            self._get_predictions(pipeline_idx=pipeline_idx)
            for pipeline_idx in range(num_pipelines)
        ]
        result = []
        for predictions in zip(*preds_per_pipeline):
            incorrect_for_all_pipelines = all(
                pred.postprocessed_output.preds.item() != pred.label for pred in predictions
            )
            pipeline_disagreement = (
                len(set(pred.postprocessed_output.preds.item() for pred in predictions)) > 1
            )
            result.append(
                PredictionComparisonResponse(
                    pipeline_disagreement=pipeline_disagreement,
                    incorrect_for_all_pipelines=incorrect_for_all_pipelines,
                )
            )

        return result

    def _get_predictions(self, pipeline_idx: int) -> List[PredictionResponse]:
        predict_task = model_contract_task_mapping(
            dataset_split_name=self.dataset_split_name,
            config=self.config,
            mod_options=ModuleOptions(
                model_contract_method_name=SupportedMethod.Predictions,
                pipeline_index=pipeline_idx,
            ),
        )
        return get_task_result(task_module=predict_task, result_type=List[PredictionResponse])

    def _get_table_key_for_pipeline_index(self, pipeline_index):
        if self.config.pipelines is None or len(self.config.pipelines) < pipeline_index:
            raise ValueError(f"Can't find pipeline {pipeline_index} from {self.config.pipelines}")
        current_pipeline = self.config.pipelines[pipeline_index]
        use_bma = self.mod_options.use_bma
        table_key = PredictionTableKey(
            temperature=current_pipeline.temperature,
            threshold=current_pipeline.threshold,
            use_bma=use_bma,
            pipeline_index=pipeline_index,
        )
        return table_key

    def _save_result(  # type: ignore
        self, res: List[PredictionComparisonResponse], dm: DatasetSplitManager
    ):
        self._validate_config()

        for pipeline_idx in range(len(assert_not_none(self.config.pipelines))):
            table_key = self._get_table_key_for_pipeline_index(pipeline_index=pipeline_idx)
            dm.add_tags(
                {
                    i: {
                        SmartTag.pipeline_disagreement: response.pipeline_disagreement,
                        SmartTag.incorrect_for_all_pipelines: response.incorrect_for_all_pipelines,
                    }
                    for i, response in enumerate(res)
                },
                table_key=table_key,
            )

    def _validate_config(self):
        if self.config.pipelines is None or len(self.config.pipelines) < 2:
            raise ValueError(
                "Can't compute prediction comparison with less than two pipelines got"
                f" {0 if self.config.pipelines is None else len(self.config.pipelines)}"
            )
