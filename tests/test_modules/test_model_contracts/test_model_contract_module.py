# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import List, cast
from unittest.mock import MagicMock

import numpy as np
import pytest
from datasets import Dataset

from azimuth.config import PipelineDefinition
from azimuth.modules.model_contracts import (
    CustomTextClassificationModule,
    HFTextClassificationModule,
)
from azimuth.types import (
    DatasetColumn,
    DatasetSplitName,
    ModuleOptions,
    SupportedMethod,
)
from azimuth.types.tag import SmartTag
from azimuth.types.task import PredictionResponse
from azimuth.utils.ml.postprocessing import PostProcessingIO
from tests.utils import get_table_key


def test_save_result(simple_text_config):
    mod = HFTextClassificationModule(
        dataset_split_name=DatasetSplitName.eval,
        config=simple_text_config,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Predictions, pipeline_index=0
        ),
    )
    dm = mod.get_dataset_split_manager(DatasetSplitName.eval)
    mod.save_result(mod.compute_on_dataset_split(), dm)

    # Testing that there is more no intent in the column "postprocessed_prediction"
    # than in "model_predictions[0]".
    rejection_class_idx = dm.rejection_class_idx
    assert len(
        dm.get_dataset_split(mod._get_table_key()).filter(
            lambda x: x[DatasetColumn.postprocessed_prediction] == rejection_class_idx
        )
    ) > len(
        dm.get_dataset_split(mod._get_table_key()).filter(
            lambda x: x[DatasetColumn.model_predictions][0] == rejection_class_idx
        )
    )


def test_high_epistemic_tag(simple_text_config):
    simple_table_key_with_bma = get_table_key(simple_text_config, use_bma=True)
    mod = HFTextClassificationModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Predictions,
            pipeline_index=0,
            indices=[4, 9, 3],
        ),
    )
    dm = mod.get_dataset_split_manager(DatasetSplitName.eval)

    # 10 high epistemic thing.
    epistemic = [0.2] * 10 + [0.01] * (dm.num_rows - 10)
    mocked_output = PostProcessingIO(
        texts=["this is a sentence."],
        preds=np.zeros(1),
        probs=np.zeros((1, dm.get_num_classes())),
        logits=np.zeros((1, dm.get_num_classes())),
    )
    predictions = [
        PredictionResponse(
            entropy=0.0,
            epistemic=epis,
            model_output=mocked_output,
            postprocessed_output=mocked_output,
            label=1,
        )
        for epis in epistemic
    ]

    # If `use_bma` is not set in the module, the `simple_table_key_with_bma` table is untouched
    # and nothing is tagged in it.
    mod.save_result(predictions, dm)
    assert (
        sum(dm.get_dataset_split(simple_table_key_with_bma)[SmartTag.high_epistemic_uncertainty])
        == 0
    )

    # Set BMA
    mod.config.uncertainty.iterations = 20
    mod.mod_options.use_bma = True

    # If BMA is set, we expect 10 tagged.
    mod.save_result(predictions, dm)
    assert (
        sum(dm.get_dataset_split(simple_table_key_with_bma)[SmartTag.high_epistemic_uncertainty])
        == 10
    )
    # With simple_table_key (use_bma is False), we should still get 10 so the smart tag is
    # available in the main prediction table.
    simple_table_key = get_table_key(simple_text_config)
    assert sum(dm.get_dataset_split(simple_table_key)[SmartTag.high_epistemic_uncertainty]) == 10


def test_pred_smart_tags(clinc_text_config):
    mod = HFTextClassificationModule(
        DatasetSplitName.eval,
        clinc_text_config,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Predictions, pipeline_index=0
        ),
    )
    dm = mod.get_dataset_split_manager(DatasetSplitName.eval)
    ds = mod.get_dataset_split()

    label_list = ds["label"]  # [9, 9, 13, 15, 15]

    random_label = 0  # Not in label_list. Top prediction for incorrect examples below.

    correct_probs = np.zeros(dm.get_num_classes())
    correct_probs[label_list[0]] = 0.9

    correct_top_3_probs = np.zeros(dm.get_num_classes())
    correct_top_3_probs[random_label] = 0.9
    correct_top_3_probs[label_list[1]] = 0.1

    correct_low_conf_probs = np.zeros(dm.get_num_classes())
    correct_low_conf_probs[label_list[2]] = 0.2

    # Incorrect prediction; label NO_INTENT; NO_INTENT IN TOP3
    incorrect_no_intent_probs = np.zeros(dm.get_num_classes())
    incorrect_no_intent_probs[random_label] = 0.9
    incorrect_no_intent_probs[label_list[3]] = 0.1

    # Model is wrong, but prediction after threshold becomes NO_INTENT; label NO_INTENT
    correct_no_intent_probs = np.zeros(dm.get_num_classes())
    correct_no_intent_probs[random_label] = 0.2

    model_output = np.array(
        (
            correct_probs,
            correct_top_3_probs,
            correct_low_conf_probs,
            incorrect_no_intent_probs,
            correct_no_intent_probs,
        )
    )

    batch = Dataset.from_dict(
        {
            mod.config.columns.text_input: [""] * len(ds),
            mod.config.columns.label: label_list,
        }
    )

    model_output, postprocessed_output = mod.get_postprocessed_output(batch, model_output)
    res = mod._parse_prediction_output(
        batch, model_output, postprocessed_output, np.random.random(len(ds))
    )

    mod.save_result(res, dm)

    clinc_table_key = get_table_key(clinc_text_config)
    assert SmartTag.correct_top_3 in dm.get_dataset_split(clinc_table_key).column_names
    assert SmartTag.correct_low_conf in dm.get_dataset_split(clinc_table_key).column_names

    assert dm.get_dataset_split(clinc_table_key)[SmartTag.correct_top_3] == [
        False,
        True,
        False,
        True,
        False,
    ], "Problem with correct_top_3 smart tag"
    assert dm.get_dataset_split(clinc_table_key)[SmartTag.correct_low_conf] == [
        False,
        False,
        True,
        False,
        False,
    ], "Problem with correct_low_conf smart tag"


def test_pred_smart_tags_2class(simple_text_config):
    simple_table_key = get_table_key(simple_text_config)
    mod = HFTextClassificationModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Predictions, pipeline_index=0
        ),
    )
    dm = mod.get_dataset_split_manager()
    res = mod.compute_on_dataset_split()
    mod.save_result(res, dm)

    assert SmartTag.correct_top_3 in dm.get_dataset_split(simple_table_key).column_names
    assert SmartTag.correct_low_conf in dm.get_dataset_split(simple_table_key).column_names

    assert not np.any(
        dm.get_dataset_split(simple_table_key)[SmartTag.correct_top_3]
    ), "Problem with correct_top_3 smart tag"


@pytest.mark.parametrize(
    "model_contract", [HFTextClassificationModule, CustomTextClassificationModule]
)
def test_structured_output_text_classification(simple_text_config, model_contract):
    simple_text_config.pipelines[0] = PipelineDefinition(
        **{
            "name": "StructuredOutputModel",
            "model": {
                "class_name": "tests.test_loading_resources.config_structured_output",
                "kwargs": {"num_classes": 2},
            },
            "postprocessors": None,
        }
    )
    mod = model_contract(
        dataset_split_name=DatasetSplitName.eval,
        config=simple_text_config,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Predictions, pipeline_index=0
        ),
    )

    preds = cast(List[PredictionResponse], mod.compute_on_dataset_split())
    mod.clear_cache()

    ####
    # Postprocessing
    ###

    mod_postpro = model_contract(
        dataset_split_name=DatasetSplitName.eval,
        config=simple_text_config,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.PostProcess, pipeline_index=0
        ),
    )
    mod_postpro.run_postprocessing = MagicMock()
    # Check that PostProcessed did not modify the probs.
    postprocessed_result = cast(List[PredictionResponse], mod_postpro.compute_on_dataset_split())
    assert (
        postprocessed_result[0].postprocessed_output.probs == preds[0].postprocessed_output.probs
    ).all()
    mod_postpro.run_postprocessing.assert_not_called()
