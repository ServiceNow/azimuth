# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import List, cast

import numpy as np
import pytest
import torch
from datasets import Dataset

from azimuth.modules.model_contracts import HFTextClassificationModule
from azimuth.types import DatasetSplitName, ModuleOptions, SupportedMethod
from azimuth.types.general.module_arguments import GradientCalculation
from azimuth.types.task import PredictionResponse, SaliencyResponse
from azimuth.utils.ml.saliency import find_word_embeddings_layer


def test_create_sentiment_pipeline(simple_text_config):
    task = HFTextClassificationModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Predictions, pipeline_index=0
        ),
    )

    assert task is not None
    # By default, use L2 gradient calculation
    assert task.gradient_calculation == GradientCalculation.L2

    sa = task.get_model()

    # As of Jan 6, 2021, fast tokenizers are not supported in pipelines
    assert not sa.tokenizer.is_fast

    # Test a different gradient calculation option
    task = HFTextClassificationModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(
            gradient_calculation="xSUM",
            model_contract_method_name=SupportedMethod.Predictions,
            pipeline_index=0,
        ),
    )

    assert task is not None
    assert task.gradient_calculation == GradientCalculation.xSUM

    # Test invalid gradient calculation option
    with pytest.raises(ValueError):
        task = HFTextClassificationModule(
            DatasetSplitName.eval,
            simple_text_config,
            mod_options=ModuleOptions(
                gradient_calculation="meh",
                model_contract_method_name=SupportedMethod.Predictions,
                pipeline_index=0,
            ),
        )

    # Test MIN option
    task = HFTextClassificationModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(
            gradient_calculation="xMIN",
            model_contract_method_name=SupportedMethod.Predictions,
            pipeline_index=0,
        ),
    )

    assert task.gradient_calculation == GradientCalculation.xMIN


def test_prediction(simple_text_config):
    indices = [1, 2, 3]
    mod = HFTextClassificationModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Predictions,
            pipeline_index=0,
            indices=indices,
        ),
    )

    res = cast(List[PredictionResponse], mod.compute_on_dataset_split())
    assert len(res) == len(indices)
    pred0 = res[0]
    assert len(pred0.model_output.probs[0]) == 2 and len(pred0.postprocessed_output.probs[0]) == 2
    assert np.allclose(np.sum(pred0.model_output.probs, axis=1), 1.0)  # 2 classes
    assert pred0.label in [0, 1]  # 2 classes
    assert pred0.model_output.preds in [0, 1]  # 2 classes
    assert pred0.entropy > 0  # Entropy > 0

    batch = Dataset.from_dict(
        {
            simple_text_config.columns.text_input: ["red", "blue", "green"],
            simple_text_config.columns.label: [1, 0, 1],
        }
    )

    res = cast(List[PredictionResponse], mod.compute(batch))
    assert len(res) == 3

    for label, pred_res in zip(batch[simple_text_config.columns.label], res):
        assert label == pred_res.label
        assert pred_res.postprocessed_output.probs.shape == (1, 2)


def test_rejection_class(simple_text_config):
    mod = HFTextClassificationModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Predictions,
            pipeline_index=0,
            indices=list(range(10)),
        ),
    )
    out = cast(List[PredictionResponse], mod.compute_on_dataset_split())

    # At least 1 out of the 10 predictions will have confidence below the threshold.
    rejected_items = [
        item for item in out if item.postprocessed_output.preds[0] != item.model_output.preds[0]
    ]
    assert len(rejected_items) > 0
    assert all(
        np.max(pred_res.postprocessed_output.probs[0]) <= simple_text_config.pipelines[0].threshold
        for pred_res in rejected_items
    ), rejected_items


def test_mc_dropout(simple_text_config):
    batch = Dataset.from_dict(
        {
            "utterance": ["this is hell.", "hello new york", "I like potatoes."],
            "label": [1, 2, 3],
        }
    )
    simple_text_config.uncertainty.iterations = 5
    p1, p2 = [
        HFTextClassificationModule(
            DatasetSplitName.eval,
            simple_text_config,
            mod_options=ModuleOptions(
                use_bma=use_bma,
                model_contract_method_name=SupportedMethod.Predictions,
                pipeline_index=0,
                indices=[4, 9, 3],
            ),
        ).compute(batch)[0]
        for use_bma in [False, True]
    ]
    assert not np.allclose(p1.model_output.probs[0], p2.model_output.probs[0])
    assert p1.epistemic == 0 and p2.epistemic > 0


def test_find_layer_by_name(simple_text_config):
    task = HFTextClassificationModule(
        dataset_split_name=DatasetSplitName.eval,
        config=simple_text_config,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Saliency, pipeline_index=0
        ),
    )

    model = task.get_model().model

    layer = find_word_embeddings_layer(model, "distilbert.embeddings.word_embeddings")

    assert isinstance(layer, torch.nn.Module)

    with pytest.raises(ValueError):
        find_word_embeddings_layer(model, "word_embeddings")


def test_saliency(dask_client, simple_text_config):
    mod = HFTextClassificationModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Saliency, pipeline_index=0, indices=[4, 25]
        ),
    )
    out = cast(List[SaliencyResponse], mod.compute_on_dataset_split())
    pipeline = mod.get_model()
    assert len(out) == 2
    assert not any(any(tok == pipeline.tokenizer.pad_token for tok in rec.tokens) for rec in out)


def test_custom_class_saliency(simple_text_config):
    # Does not work on L2. TODO Verify this behaviour is as expected.
    gc = "xSUM"
    all_options = [
        ModuleOptions(
            gradient_calculation=gc,
            model_contract_method_name=SupportedMethod.Saliency,
            pipeline_index=0,
        ),
        ModuleOptions(
            gradient_calculation=gc,
            filter_class=0,
            model_contract_method_name=SupportedMethod.Saliency,
            pipeline_index=0,
        ),
        ModuleOptions(
            gradient_calculation=gc,
            filter_class=1,
            model_contract_method_name=SupportedMethod.Saliency,
            pipeline_index=0,
        ),
    ]
    batch = Dataset.from_dict({"utterance": ["this is hell."]})
    result = [
        cast(
            List[SaliencyResponse],
            HFTextClassificationModule(
                DatasetSplitName.eval,
                simple_text_config,
                mod_options=mod_options,
            ).compute(batch),
        )
        for mod_options in all_options
    ]

    # Check that None matches with one of the other
    assert any(np.allclose(result[0][0].saliency, result[i][0].saliency) for i in [1, 2])

    # Check 0, 1 do not match.
    assert not np.allclose(result[1][0].saliency, result[2][0].saliency)


def test_load_CLINC150_dataset(clinc_text_config):
    task = HFTextClassificationModule(
        DatasetSplitName.train,
        clinc_text_config,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Predictions, pipeline_index=0
        ),
    )

    ds = task.get_dataset_split()
    assert ds is not None
    labels_str = [ds.features["label"].int2str(label) for label in ds["label"]]
    # We replaced the out-of-scope label with NO_INTENT
    assert "NO_INTENT" in labels_str and "oos" not in labels_str
    # only 3 classes in the subset: "transfer", "transactions" and "NO_INTENT"
    assert len(ds) == 6

    ds = task.get_dataset_split(DatasetSplitName.eval)
    assert ds is not None
    assert "NO_INTENT" in labels_str and "oos" not in labels_str
    # only 3 classes in the subset: "transfer", "transactions" and "NO_INTENT"
    assert len(ds) == 5


def test_long_utterances_truncated(simple_text_config):
    mod = HFTextClassificationModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(
            pipeline_index=0, model_contract_method_name=SupportedMethod.Predictions
        ),
    )

    max_input_size = max(mod.get_model().tokenizer.max_model_input_sizes.values())
    batch = Dataset.from_dict({"utterance": ["potato " * max_input_size], "label": [0]})
    _ = mod.compute(batch)

    mod = HFTextClassificationModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(
            pipeline_index=0, model_contract_method_name=SupportedMethod.Saliency
        ),
    )
    mod.compute(batch)
