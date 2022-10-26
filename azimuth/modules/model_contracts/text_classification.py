# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
import abc
from typing import Any, Dict, List, Protocol, Tuple, Union, cast, runtime_checkable

import numpy as np
import tensorflow
import torch
import transformers
from datasets import Dataset
from scipy.special import softmax
from scipy.stats import entropy
from transformers.file_utils import ModelOutput

from azimuth.modules.base_classes import ModelContractModule
from azimuth.modules.task_execution import get_task_result
from azimuth.types import DatasetColumn, InputResponse, ModuleOptions, SupportedMethod
from azimuth.types.task import PredictionResponse, SaliencyResponse
from azimuth.utils.ml.postprocessing import PostProcessingIO, PostprocessingStep
from azimuth.utils.ml.preprocessing import PreprocessingStep
from azimuth.utils.project import postprocessing_editable

EPSILON = 1e-6

ITERATIONS = 100


@runtime_checkable
class PipelineOutputProtocol(Protocol):
    """Class containing result of a batch"""

    # model output without passing through post-processing stage: texts, logits, probs, preds
    model_output: PostProcessingIO
    # output after passing through post-processing: pre-processed texts, logits, probs, preds
    postprocessor_output: PostProcessingIO


@runtime_checkable
class PipelineOutputProtocolV2(Protocol):
    """Class containing result of a batch with pre and postprocessing steps"""

    # model output without passing through post-processing stage: texts, logits, probs, preds
    model_output: PostProcessingIO
    # output after passing through post-processing: pre-processed texts, logits, probs, preds
    postprocessor_output: PostProcessingIO
    preprocessing_steps: List[Dict[str, Union[str, List[str], int]]]
    postprocessing_steps: List[Dict[str, Union[str, PostProcessingIO, int]]]


SupportedOutput = Union[
    PipelineOutputProtocol,
    np.ndarray,  # Shape [N, num_classes]
    torch.Tensor,  # Shape [N, num_classes]
    tensorflow.Tensor,
    transformers.file_utils.ModelOutput,
]


class TextClassificationModule(ModelContractModule, abc.ABC):
    """Handles text classification prediction and saliency."""

    def get_input(self, batch: Dataset) -> List[InputResponse]:
        return [InputResponse(input=x) for x in batch[self.config.columns.text_input]]

    @abc.abstractmethod
    def predict(self, batch: Dataset) -> List[PredictionResponse]:
        """Get predictions for a batch of utterances.

        Args:
            batch: batch of utterances.

        Returns:
            Predictions for the batch of utterances.

        """
        raise NotImplementedError

    @abc.abstractmethod
    def saliency(self, batch: Dataset) -> List[SaliencyResponse]:
        """Get saliency maps for a batch of utterances using InputXGrad.

        Saliency maps can be computed for the predicted class or for another class through the
        `filter_class` mod_options.

        Args:
            batch: Batch of utterances.

        Returns:
            Saliency maps for a batch of utterances.

        """
        raise NotImplementedError

    def post_process(self, batch: Dataset) -> List[PredictionResponse]:
        """This function recompute post-processing, without recomputing predictions from the model.

        This can be useful when another module needs to compute information based on different
        post-processors values. Ex: threshold, temperature. These values can be changed in the
        config, or set through module options.

        Args:
            batch: batch of utterances

        Returns:
            Predictions, with the updated postprocess values.

        """
        # Get cached predictions
        predictions_task = type(self)(
            dataset_split_name=self.dataset_split_name,
            config=self.config,
            mod_options=ModuleOptions(
                model_contract_method_name=SupportedMethod.Predictions,
                pipeline_index=self.mod_options.pipeline_index,
                indices=cast(List[int], batch[DatasetColumn.row_idx]),
            ),
        )
        predictions = get_task_result(
            task_module=predictions_task, result_type=List[PredictionResponse]
        )

        if not postprocessing_editable(self.config, pipeline_index=self.mod_options.pipeline_index):
            return predictions

        # Reconstruct pipeline_out and all_epistemic
        dm = self.get_dataset_split_manager()
        pipeline_out = np.zeros(
            (len(batch[DatasetColumn.row_idx]), dm.get_num_classes(labels_only=True))
        )
        epistemic_all = []
        for idx, pred in enumerate(predictions):
            pipeline_out[idx, :] = pred.model_output.probs
            epistemic_all.append(pred.epistemic)

        # Call post_processing and reconstruct product output
        (
            model_output,
            postprocessed_output,
            preprocessing_steps,
            postprocessing_steps,
        ) = self.get_postprocessed_output(batch, pipeline_out)
        return self._parse_prediction_output(
            batch,
            model_output,
            postprocessed_output,
            preprocessing_steps,
            postprocessing_steps,
            epistemic_all,
        )

    def extract_probs_from_output(self, model_out: Any) -> np.ndarray:
        """Extract probabilities from model output.

        Args:
            model_out: Model's output following one of our conventions.
                Can be an array, tensor, output of HF pipeline
                 or transformers.ModelOutput.

        Returns:
            Array as probabilities.
        """
        if isinstance(model_out, np.ndarray):
            out = model_out
        elif isinstance(model_out, torch.Tensor):
            out = model_out.numpy()
        elif isinstance(model_out, tensorflow.Tensor):
            out = np.array(model_out)
        elif (
            isinstance(model_out, list)
            and isinstance(model_out[0], list)
            and model_out[0]
            and isinstance(model_out[0][0], dict)
            and "score" in model_out[0][0]
        ):
            out = np.array([[cls_out["score"] for cls_out in record] for record in model_out])
        elif isinstance(model_out, ModelOutput):
            out = softmax(model_out["logits"].cpu().numpy(), -1)
        elif hasattr(model_out, "model_output"):
            # NOTE: One can give this in some cases.
            out = model_out.model_output.probs
        else:
            raise ValueError(
                "Can't handle this type of Model output,"
                f" expecting {SupportedOutput}."
                f" Got {type(model_out)}, {model_out}"
            )
        return out

    def _parse_prediction_output(
        self,
        input_batch: Dataset,
        model_output: PostProcessingIO,
        postprocessed_output: PostProcessingIO,
        preprocessing_steps: List[PreprocessingStep],
        postprocessing_steps: List[PostprocessingStep],
        epistemic: List[float],
    ) -> List[PredictionResponse]:
        """Take the pipeline output and return a PredictionResponse.

        Args:
            input_batch: Input batch.
            model_output: Output of the model
            postprocessed_output: Postprocessed output of the model.
            epistemic: Epistemic uncertainty for each element of the batch.

        Returns:
            List of PredictionResponse for each element.
        """
        json_output = []
        labels = input_batch[self.config.columns.label]

        for idx, (label, epis) in enumerate(zip(labels, epistemic)):
            json_output.append(
                PredictionResponse(
                    label=label,
                    # The __getitem__ method allows to get from batch results to utterance results
                    model_output=model_output[idx],
                    postprocessed_output=postprocessed_output[idx],
                    preprocessing_steps=[
                        preprocessing_step[idx] for preprocessing_step in preprocessing_steps
                    ],
                    postprocessing_steps=[
                        postprocessing_step[idx] for postprocessing_step in postprocessing_steps
                    ],
                    entropy=entropy(postprocessed_output[idx].probs[0]),
                    epistemic=epis,
                )
            )

        return json_output

    def get_postprocessed_output(
        self, input_batch: Dataset, pipeline_output
    ) -> Tuple[
        PostProcessingIO, PostProcessingIO, List[PreprocessingStep], List[PostprocessingStep]
    ]:
        """Get postprocessed output from model output.

        Args:
            input_batch: Model input
            pipeline_output: Output of the model.

        Returns:
            Raw and postprocessed output.
        """
        if isinstance(pipeline_output, PipelineOutputProtocolV2):
            # User is following our contract, we can work with it.
            # Constructing new objects so indexing works.
            return (
                PostProcessingIO(
                    texts=input_batch[self.config.columns.text_input],
                    probs=pipeline_output.model_output.probs,
                    preds=pipeline_output.model_output.preds,
                    logits=pipeline_output.model_output.logits,
                ),
                PostProcessingIO(
                    texts=input_batch[self.config.columns.text_input],
                    probs=pipeline_output.postprocessor_output.probs,
                    preds=pipeline_output.postprocessor_output.preds,
                    logits=pipeline_output.postprocessor_output.logits,
                ),
                [
                    PreprocessingStep(
                        order=step["order"], class_name=step["class_name"], text=step["text"]
                    )
                    for step in pipeline_output.preprocessing_steps
                ],
                [
                    PostprocessingStep(
                        order=step["order"],
                        class_name=step["class_name"],
                        output=PostProcessingIO(
                            texts=input_batch[self.config.columns.text_input],
                            probs=cast(PostProcessingIO, step["output"]).probs,
                            preds=cast(PostProcessingIO, step["output"]).preds,
                            logits=cast(PostProcessingIO, step["output"]).logits,
                        ),
                    )
                    for step in pipeline_output.postprocessing_steps
                ],
            )
        if isinstance(pipeline_output, PipelineOutputProtocol):
            # User is following our contract, we can work with it.
            # Constructing PostProcessingIO object so indexing works.
            return (
                PostProcessingIO(
                    texts=input_batch[self.config.columns.text_input],
                    probs=pipeline_output.model_output.probs,
                    preds=pipeline_output.model_output.preds,
                    logits=pipeline_output.model_output.logits,
                ),
                PostProcessingIO(
                    texts=input_batch[self.config.columns.text_input],
                    probs=pipeline_output.postprocessor_output.probs,
                    preds=pipeline_output.postprocessor_output.preds,
                    logits=pipeline_output.postprocessor_output.logits,
                ),
                [],
                [],
            )

        rejection_class_idx = self.get_dataset_split_manager().rejection_class_idx
        rejection_class_threshold = self.get_threshold()

        probs = self.extract_probs_from_output(pipeline_output)
        logits = (
            np.log(probs + EPSILON)
            if np.allclose(probs.sum(-1), 1.0)
            else np.log(probs / (1 - probs) + EPSILON)
        )

        model_out_formatted = PostProcessingIO(
            texts=input_batch[self.config.columns.text_input],
            logits=logits,
            probs=probs,
            preds=np.argmax(probs, axis=-1),
        )
        postprocessed_steps = self.run_postprocessing(
            model_out_formatted,
            threshold=rejection_class_threshold,
            rejection_class_idx=rejection_class_idx,
        )
        postprocessed_output = postprocessed_steps[-1].output
        # Preprocessing steps are not supported at the moment for HF pipelines
        return model_out_formatted, postprocessed_output, [], postprocessed_steps

    def empty_saliency_from_batch(self, batch) -> List[SaliencyResponse]:
        """Return dummy output to not break API consumers.

        Args:
            batch: Utterances.

        Returns:
            Saliencies of 0.

        """
        records: List[SaliencyResponse] = []
        tokenizer = self.artifact_manager.get_tokenizer()
        for utterance in batch[self.config.columns.text_input]:
            token_ids = tokenizer(utterance)["input_ids"]
            tokens = tokenizer.convert_ids_to_tokens(token_ids)
            tokens = [
                token for token in tokens if token not in [tokenizer.cls_token, tokenizer.sep_token]
            ]

            json_output = SaliencyResponse(
                saliency=[0.0] * len(tokens),
                tokens=tokens,
            )
            records.append(json_output)
        return records
