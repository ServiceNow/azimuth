# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import List, Optional, Set

import numpy as np
import structlog
import torch
from datasets import Dataset

from azimuth.config import ModelContractConfig
from azimuth.modules.model_contracts.text_classification import TextClassificationModule
from azimuth.types import DatasetSplitName, ModuleOptions
from azimuth.types.general.module_options import GradientCalculation
from azimuth.types.task import PredictionResponse, SaliencyResponse
from azimuth.utils.ml.mc_dropout import MCDropout
from azimuth.utils.ml.saliency import (
    get_saliency,
    register_embedding_gradient_hook,
    register_embedding_list_hook,
)

log = structlog.get_logger(__file__)
EPSILON = 1e-6

ITERATIONS = 100


class HFTextClassificationModule(TextClassificationModule):
    """Handles text classification prediction and saliency."""

    allowed_mod_options: Set[str] = TextClassificationModule.allowed_mod_options | {
        "gradient_calculation",
        "iterations",
        "use_bma",
        "filter_class",
    }

    def __init__(
        self,
        dataset_split_name: DatasetSplitName,
        config: ModelContractConfig,
        mod_options: Optional[ModuleOptions] = None,
    ):
        super().__init__(dataset_split_name, config, mod_options)

        gc_value = self.mod_options.gradient_calculation
        self.saliency_layer = self.config.saliency_layer
        self.gradient_calculation = GradientCalculation(gc_value)

    def predict(self, batch: Dataset) -> List[PredictionResponse]:
        """Get predictions for a batch of utterances.

        If more than one iteration is requested, this function will perform MC Dropout and
        compute both the mean prediction and the epistemic uncertainty using BALD.

        Args:
            batch: batch of utterances.

        Returns:
            Predictions for the batch of utterances.

        """
        utterances = batch[self.config.columns.text_input]

        model = self.get_model()
        use_bma = self.mod_options.use_bma and self.config.uncertainty.iterations > 1
        if use_bma:
            # structlog warning issue tracked in BaaL #192
            from baal.active.heuristics import BALD

            with MCDropout(model.model):
                predictions = np.stack(
                    [
                        self.extract_probs_from_output(
                            model(
                                utterances,
                                num_workers=0,
                                batch_size=self.config.batch_size,
                                truncation=True,
                            )
                        )
                        for _ in range(self.config.uncertainty.iterations)
                    ],
                    axis=-1,
                )
                epistemic: List[float] = BALD().get_uncertainties(predictions)
                pipeline_out = predictions.mean(-1)

        else:
            epistemic = [0.0] * len(utterances)
            pipeline_out = model(
                utterances, num_workers=0, batch_size=self.config.batch_size, truncation=True
            )
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
            epistemic,
        )

    def saliency(self, batch: Dataset) -> List[SaliencyResponse]:
        """Get saliency maps for a batch of utterances using InputXGrad.

        Saliency maps can be computed for the predicted class or for another class through the
        `filter_class` mod_options.

        Args:
            batch: Batch of utterances.

        Returns:
            Saliency maps for a batch of utterances.

        """
        if self.saliency_layer is None:
            return self.empty_saliency_from_batch(batch)

        pipeline = self.get_model()

        inputs = pipeline.tokenizer(
            batch[self.config.columns.text_input],
            return_tensors="pt",
            padding=True,
            truncation=True,
        )
        all_tokens = [pipeline.tokenizer.convert_ids_to_tokens(i) for i in inputs["input_ids"]]

        # Move to the same device as the pipeline
        inputs["input_ids"] = inputs["input_ids"].to(pipeline.device)
        inputs["attention_mask"] = inputs["attention_mask"].to(pipeline.device)

        logits = pipeline.model(**inputs)[0]
        output = torch.softmax(logits, dim=1).detach().cpu().numpy()
        prediction = output.argmax(-1)

        embeddings_list: List[np.ndarray] = []
        handle = register_embedding_list_hook(pipeline.model, embeddings_list, self.saliency_layer)
        embeddings_gradients: List[np.ndarray] = []
        hook = register_embedding_gradient_hook(
            pipeline.model, embeddings_gradients, self.saliency_layer
        )

        filter_class = self.mod_options.filter_class
        selected_classes = (
            [filter_class] * len(prediction) if filter_class is not None else prediction
        )
        inputs["labels"] = torch.tensor(selected_classes, dtype=torch.long, device=pipeline.device)

        # Do backward pass to compute gradients
        pipeline.model.zero_grad()
        _loss = pipeline.model(**inputs)[0]  # loss is at index 0 when passing labels
        _loss.backward()
        handle.remove()
        hook.remove()
        records = []
        for eg, el, tokens in zip(embeddings_gradients[0], embeddings_list[0], all_tokens):
            saliency_values = get_saliency(eg, el, self.gradient_calculation)
            # Strip pad_token (ex. [PAD])
            saliency_values, tokens = zip(
                *list(
                    filter(
                        lambda tok: tok[1] != pipeline.tokenizer.pad_token,
                        zip(saliency_values, tokens),
                    )
                )
            )
            records.append(
                SaliencyResponse(
                    saliency=saliency_values,
                    tokens=tokens,
                )
            )

        return records
