import abc
from typing import List

import numpy as np
from scipy.special import expit, softmax

from azimuth.types import AliasModel, Array
from azimuth.types.outcomes import OutcomeName


class PostProcessingIO(AliasModel):
    texts: List[str]
    logits: Array[float]
    preds: Array[int]
    probs: Array[float]

    @property
    def is_multiclass(self):
        return np.allclose(self.probs.sum(-1), 1.0)

    def __getitem__(self, item: int) -> "PostProcessingIO":
        """Useful to get from a batch result to a single utterance result."""
        return PostProcessingIO(
            texts=[self.texts[item]],
            logits=self.logits[item][np.newaxis, ...],
            preds=self.preds[item][np.newaxis, ...],
            probs=self.probs[item][np.newaxis, ...],
        )


class PredictionDetails(AliasModel):
    # Prediction class names, sorted by confidences
    predictions: List[str]
    # Predicted class, which can be different than the first element of predictions, when
    # thresholding for instance.
    prediction: str
    # Sorted confidences
    confidences: List[float]
    # Outcome based on label and prediction
    outcome: OutcomeName


class PostprocessingStepItem(AliasModel):
    """Class for saving the results in the dataset and the routes."""

    order: int
    output: PredictionDetails
    class_name: str


class PostprocessingStep(AliasModel):
    """Class received from the pipeline, and used in the Prediction Module."""

    order: int
    output: PostProcessingIO
    class_name: str

    def __getitem__(self, item: int) -> "PostprocessingStep":
        """Useful to get from a batch result to a single utterance result."""
        return PostprocessingStep(
            order=self.order, output=self.output[item], class_name=self.class_name
        )


class Postprocessing(abc.ABC):
    """Generic Functors for postprocessing.

    From a PostProcessingIO object returns a transformed PostProcessingIO.
    PostProcessingIO must be consistent across steps!
    If we modify the logits, we must recompute the confidences.

    """

    @abc.abstractmethod
    def __call__(self, post_processing_io: PostProcessingIO) -> PostProcessingIO:
        ...

    def to_prob(self, post_processing_io: PostProcessingIO) -> PostProcessingIO:
        """Return an updated version of `post_processing_io` with the correct probabilities.

        Args:
            post_processing_io: Model output with logits computed.

        Returns:
            Updated post_processing_io with probs computed.
        """
        return PostProcessingIO(
            texts=post_processing_io.texts,
            logits=post_processing_io.logits,
            preds=post_processing_io.preds,
            probs=softmax(post_processing_io.logits, axis=1)
            if post_processing_io.is_multiclass
            else expit(post_processing_io.logits),
        )


class TemperatureScaling(Postprocessing):
    """Postprocessing step to perform Temperature scaling.

    Temperature scaling is a simple approach to improve calibration.
    By dividing logits by a single number, the softmax-ed probability will be closer
    to a uniform distribution.

    Args:
        temperature: Which value to divide the logits by.
    """

    def __init__(self, temperature):
        self.temperature = temperature

    def __call__(self, post_processing_io: PostProcessingIO) -> PostProcessingIO:
        new_logits = post_processing_io.logits / self.temperature
        confidences = (
            softmax(new_logits, axis=1) if post_processing_io.is_multiclass else expit(new_logits)
        )
        return PostProcessingIO(
            texts=post_processing_io.texts,
            logits=new_logits,
            preds=post_processing_io.preds,
            probs=confidences,
        )


class Thresholding(Postprocessing):
    """Postprocessing step to perform thresholding.

    If a prediction confidence falls below the threshold, we make no prediction.

    Args:
        threshold: Threshold at which we make a prediction.
        rejection_class_idx: What to return when the prediction is below a threshold.

    """

    def __init__(self, threshold, rejection_class_idx=-1):
        self.threshold = threshold
        self.rejection_class_idx = rejection_class_idx

    def __call__(self, post_processing_io: PostProcessingIO) -> PostProcessingIO:
        threshold = self.threshold or 0.0
        predictions = np.where(
            post_processing_io.probs.max(axis=-1) > threshold,
            np.argmax(post_processing_io.probs, -1),
            self.rejection_class_idx,
        )
        return PostProcessingIO(
            texts=post_processing_io.texts,
            logits=post_processing_io.logits,
            preds=predictions,
            probs=post_processing_io.probs,
        )
