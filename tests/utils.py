# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from azimuth.modules.model_contract_task_mapping import model_contract_task_mapping
from azimuth.types import DatasetSplitName, ModuleOptions, SupportedMethod


def save_predictions(config, ds_split_name=DatasetSplitName.eval):
    pred_mod = model_contract_task_mapping(
        dataset_split_name=ds_split_name,
        config=config,
        mod_options=ModuleOptions(
            pipeline_index=0, model_contract_method_name=SupportedMethod.Predictions
        ),
    )
    pred_res = pred_mod.compute_on_dataset_split()
    dm = pred_mod.get_dataset_split_manager()
    pred_mod.save_result(pred_res, dm)
