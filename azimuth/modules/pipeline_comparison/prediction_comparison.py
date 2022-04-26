from typing import List, cast

from azimuth.config import ModelContractConfig
from azimuth.dataset_split_manager import DatasetSplitManager, PredictionTableKey
from azimuth.modules.base_classes import DatasetResultModule
from azimuth.modules.model_contract_task_mapping import model_contract_task_mapping
from azimuth.modules.task_execution import get_task_result
from azimuth.types import AliasModel, ModuleOptions, ModuleResponse, SupportedMethod
from azimuth.types.tag import SmartTag
from azimuth.types.task import PredictionResponse


class PredictionComparisonResponse(AliasModel):
    one_model_disagrees: bool
    all_models_wrong: bool


class PredictionComparisonModule(DatasetResultModule[ModelContractConfig]):
    def compute_on_dataset_split(self) -> List[PredictionComparisonResponse]:  # type: ignore
        ds = self.get_dataset_split()
        if self.config.pipelines is None or len(self.config.pipelines) < 2:
            return [
                PredictionComparisonResponse(one_model_disagrees=False, all_models_wrong=False)
            ] * ds.num_rows
        num_pipelines = len(self.config.pipelines)
        preds_per_pipeline = [
            self._get_predictions(pipeline_idx=pipeline_idx)
            for pipeline_idx in range(num_pipelines)
        ]
        result = []
        for predictions in zip(*preds_per_pipeline):
            one_model_disagrees = all(
                pred.postprocessed_output.preds.item() != pred.label for pred in predictions
            )
            all_models_wrong = (
                len(set(pred.postprocessed_output.preds.item() for pred in predictions)) > 1
            )
            result.append(
                PredictionComparisonResponse(
                    one_model_disagrees=one_model_disagrees, all_models_wrong=all_models_wrong
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

    def _save_result(self, res: List[ModuleResponse], dm: DatasetSplitManager):
        results = cast(List[PredictionComparisonResponse], res)
        if self.config.pipelines is None:
            return

        for pipeline_idx in range(len(self.config.pipelines)):
            table_key = self._get_table_key_for_pipeline_index(pipeline_index=pipeline_idx)
            dm.add_tags(
                {
                    i: {
                        SmartTag.one_model_disagrees: response.one_model_disagrees,
                        SmartTag.all_models_wrong: response.all_models_wrong,
                    }
                    for i, response in enumerate(results)
                },
                table_key=table_key,
            )
