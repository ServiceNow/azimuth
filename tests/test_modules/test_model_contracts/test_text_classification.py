# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import List, cast

import numpy as np
import pytest
import tensorflow as tf
import torch
from datasets import Dataset
from transformers.file_utils import ModelOutput

from azimuth.config import AzimuthConfig, PipelineDefinition
from azimuth.modules.model_contracts import (
    FileBasedTextClassificationModule,
    HFTextClassificationModule,
)
from azimuth.types import DatasetSplitName, ModuleOptions, SupportedMethod
from azimuth.types.task import PredictionResponse, SaliencyResponse
from azimuth.utils.ml.postprocessing import PostProcessingIO, TemperatureScaling


def test_create_dataset(simple_text_config):
    task = HFTextClassificationModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(model_contract_method_name=SupportedMethod.Predictions),
    )

    assert task is not None
    assert task.get_dataset_split() is not None
    assert len(task.get_dataset_split()) > 0
    assert len(task.get_dataset_split()[0]["utterance"]) > 0


@pytest.mark.skipif(not torch.cuda.is_available(), reason="requires cuda enabled")
def test_cuda_support(simple_text_config):
    batch = Dataset.from_dict(
        {
            "utterance": ["I love my life"],
        }
    )

    task = HFTextClassificationModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Saliency, pipeline_index=0
        ),
    )

    # Since we share one model across all instances, the device could still be CPU, so reset it
    HFTextClassificationModule.pipeline = None
    model = task.get_model()
    # index 0 may not always be correct
    assert model.device == torch.device("cuda", index=0)

    json_output = cast(SaliencyResponse, task.compute(batch)[0])

    # There must be a saliency value per token
    assert len(json_output.saliency) == len(json_output.tokens)


def test_post_process(simple_text_config):
    indices = [1, 2, 3]
    mod_low = HFTextClassificationModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(
            threshold=0.1,
            model_contract_method_name=SupportedMethod.PostProcess,
            pipeline_index=0,
            indices=indices,
        ),
    )

    mod_high = HFTextClassificationModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(
            threshold=0.9,
            model_contract_method_name=SupportedMethod.PostProcess,
            pipeline_index=0,
            indices=indices,
        ),
    )

    res_low = cast(List[PredictionResponse], mod_low.compute_on_dataset_split())
    # With a low threshold, the post-processing is not affecting the predicted class with a random
    # model.
    assert np.all([pred.model_output.preds == pred.postprocessed_output.preds for pred in res_low])
    # The prediction of the last pipeline step should be the same as the postprocessed prediction.
    assert all(
        pred.postprocessed_output.preds == pred.postprocessing_steps[-1].output.preds
        for pred in res_low
    )

    res_high = cast(List[PredictionResponse], mod_high.compute_on_dataset_split())
    # With a high threshold, the post-processing is affecting all predicted classes with a random
    # model.
    assert np.all([pred.model_output.preds != pred.postprocessed_output.preds for pred in res_high])
    # Assessing prediction is rejection_class
    rejection_class_idx = mod_high.get_dataset_split_manager().rejection_class_idx
    assert np.all([pred.postprocessed_output.preds == rejection_class_idx for pred in res_high])
    # The prediction of the last pipeline step should be the same as the postprocessed prediction.
    assert np.all(
        [
            pred.postprocessed_output.preds == pred.postprocessing_steps[-1].output.preds
            for pred in res_high
        ]
    )

    # Try with threshold set at 0.
    mod_none = HFTextClassificationModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(
            threshold=0,
            model_contract_method_name=SupportedMethod.PostProcess,
            pipeline_index=0,
            indices=indices,
        ),
    )

    res_none = cast(List[PredictionResponse], mod_none.compute_on_dataset_split())
    rejection_class_idx = mod_none.get_dataset_split_manager().rejection_class_idx
    # No prediction should be the rejection class.
    assert np.all([pred.postprocessed_output.preds != rejection_class_idx for pred in res_none])
    assert np.all(
        [
            pred.postprocessed_output.preds == pred.postprocessing_steps[-1].output.preds
            for pred in res_none
        ]
    )


def test_post_process_file_based(file_text_config_top1):
    indices = [1, 2, 3]
    mod_low = FileBasedTextClassificationModule(
        DatasetSplitName.eval,
        file_text_config_top1,
        mod_options=ModuleOptions(
            threshold=0.1,
            model_contract_method_name=SupportedMethod.PostProcess,
            pipeline_index=0,
            indices=indices,
        ),
    )

    mod_high = FileBasedTextClassificationModule(
        DatasetSplitName.eval,
        file_text_config_top1,
        mod_options=ModuleOptions(
            threshold=0.9,
            model_contract_method_name=SupportedMethod.PostProcess,
            pipeline_index=0,
            indices=indices,
        ),
    )

    res_low = cast(List[PredictionResponse], mod_low.compute_on_dataset_split())
    res_high = cast(List[PredictionResponse], mod_high.compute_on_dataset_split())
    # With file-based, the threshold should not affect the post-processed values
    assert np.all(
        [
            pred_low.postprocessed_output.preds == pred_high.postprocessed_output.preds
            for pred_low, pred_high in zip(res_low, res_high)
        ]
    )
    # No postprocessing steps for file-based.
    assert np.all([len(pred.postprocessing_steps) == 0 for pred in res_low])


def test_post_process_no_postprocessors(tiny_text_config_no_postprocessor):
    indices = [0, 1, 2]
    mod = HFTextClassificationModule(
        DatasetSplitName.eval,
        tiny_text_config_no_postprocessor,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Predictions,
            pipeline_index=0,
            indices=indices,
        ),
    )
    res = cast(List[PredictionResponse], mod.compute_on_dataset_split())
    assert np.all(
        [res[idx].model_output.probs == res[idx].postprocessed_output.probs for idx in indices]
    )


def test_get_input(dask_client, simple_text_config):
    mod = HFTextClassificationModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Inputs, pipeline_index=0, indices=[4, 25]
        ),
    )
    out = mod.compute_on_dataset_split()

    assert len(out) == 2


def test_temperature_scaling(simple_text_config):
    batch = Dataset.from_dict({"utterance": ["this is hell."], "label": [1]})
    predictions = []
    for temp in [1, 10]:
        cfg = AzimuthConfig(
            **{
                **simple_text_config.dict(by_alias=True),
                "pipelines": [
                    PipelineDefinition(
                        name="MyModel",
                        model=simple_text_config.pipelines[0].model,
                        postprocessors=[
                            {"temperature": temp},
                            {"threshold": simple_text_config.pipelines[-1].threshold},
                        ],
                    )
                ],
            }
        )
        predictions.append(
            HFTextClassificationModule(
                DatasetSplitName.eval,
                cfg,
                mod_options=ModuleOptions(
                    model_contract_method_name=SupportedMethod.Predictions, pipeline_index=0
                ),
            ).compute(batch)[0]
        )

    pred, pred_tempered = predictions
    # Predictions should be the same before post-processing
    assert np.allclose(pred.model_output.probs, pred_tempered.model_output.probs)
    # Predictions should not be the same after post-processing
    assert not np.allclose(
        pred.postprocessed_output.probs, pred_tempered.postprocessed_output.probs
    )
    assert np.isclose(
        pred.postprocessed_output.probs.sum(), pred_tempered.postprocessed_output.probs.sum()
    )
    # The tempered probs at step 0 in the postprocessing_steps should be
    # the same as the postprocessed probs.
    assert pred_tempered.postprocessing_steps[0].class_name == "TemperatureScaling"
    assert np.allclose(
        pred_tempered.postprocessed_output.probs, pred_tempered.postprocessing_steps[0].output.probs
    )

    # Verify that temp=1 is the original pred.
    mod = HFTextClassificationModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Predictions, pipeline_index=0
        ),
    )
    model = mod.get_model()
    output = np.array([record["score"] for record in model(batch["utterance"])[0]])
    assert np.allclose(output, pred.postprocessed_output.probs[0])


def test_temperature_scaling_multilabel(simple_text_config):
    multiclass_input = np.array([[0.2, 0.8]])
    multilabel_input = np.array([[0.3, 0.2]])
    input_text = ["this is a sentence."]

    temp = TemperatureScaling(temperature=1.0)
    # Test on multiclass
    out = temp(
        PostProcessingIO(
            texts=input_text,
            probs=multiclass_input,
            logits=np.log(multiclass_input),
            preds=np.argmax(multiclass_input, -1),
        )
    ).probs
    assert np.isclose(out.sum(), 1.0)
    assert np.allclose(out, multiclass_input)

    # Test multilabel
    temp_ml = TemperatureScaling(1.0)
    out = temp_ml(
        PostProcessingIO(
            texts=input_text,
            probs=multilabel_input,
            logits=np.log(multilabel_input / (1 - multilabel_input)),
            preds=np.argmax(multilabel_input, -1),
        )
    ).probs
    assert out.min() >= 0.0 and out.max() <= 1.0
    assert np.allclose(out, multilabel_input)

    temp.temperature = 8.0
    # Test on multiclass
    out = temp(
        PostProcessingIO(
            texts=input_text,
            probs=multiclass_input,
            logits=np.log(multiclass_input),
            preds=np.argmax(multiclass_input, -1),
        )
    ).probs
    assert np.isclose(out.sum(), 1.0)
    assert not np.allclose(out, multiclass_input)

    # Test multilabel
    temp_ml.temperature = 8.0
    out = temp_ml(
        PostProcessingIO(
            texts=input_text,
            probs=multilabel_input,
            logits=np.log(multilabel_input / (1 - multilabel_input)),
            preds=np.argmax(multilabel_input, -1),
        )
    ).probs
    assert out.min() >= 0.0 and out.max() <= 1.0
    assert not np.allclose(out, multilabel_input)


def test_extract_output(simple_text_config):
    mod = HFTextClassificationModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Predictions, indices=[4, 9, 3]
        ),
    )
    real_output = np.array([[0.1, 0.9]])
    assert np.allclose(real_output, mod.extract_probs_from_output(real_output))
    assert np.allclose(real_output, mod.extract_probs_from_output(torch.from_numpy(real_output)))
    assert np.allclose(
        real_output, mod.extract_probs_from_output(tf.convert_to_tensor(real_output))
    )
    assert np.allclose(
        real_output,
        mod.extract_probs_from_output([[{"score": i} for i in item] for item in real_output]),
    )
    assert np.allclose(
        real_output,
        mod.extract_probs_from_output(ModelOutput({"logits": torch.from_numpy(real_output).log()})),
    )

    with pytest.raises(ValueError, match="Can't handle"):
        mod.extract_probs_from_output(real_output.tolist())

    with pytest.raises(ValueError, match="Can't handle"):
        mod.extract_probs_from_output(((0.1, 0.2),))


if __name__ == "__main__":
    pytest.main()
