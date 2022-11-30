# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import Any, List

import numpy as np
import structlog

from azimuth.types.general.module_options import GradientCalculation

log = structlog.get_logger()


def find_word_embeddings_layer(model: Any, layer_name: str) -> Any:
    """
    Find the word embedding layer according to the name set in the config.

    Args:
        model: Model
        layer_name: Layer Name

    Returns:
        Module of the word embedding layer.

    Raises:
        ValueError if searchable_str not a valid layer in the model.

    """
    searchable_str = layer_name.lower().strip()

    for name, layer in model.named_modules():
        if name == searchable_str:
            return layer

    raise ValueError(f"{searchable_str} layer not found in model")


def register_embedding_list_hook(
    model: Any, embeddings_list: List[np.ndarray], layer_name: str
) -> Any:
    """Register hook to get the embedding values from model.

    Args:
        model: Model.
        embeddings_list: Variable to save values.
        layer_name: Name of the embedding layer.

    Returns:
        Hook.
    """

    def forward_hook(module, inputs, output):
        embeddings_list.append(output.detach().cpu().clone().numpy())

    embedding_layer = find_word_embeddings_layer(model, layer_name)
    handle = embedding_layer.register_forward_hook(forward_hook)

    return handle


def register_embedding_gradient_hook(
    model: Any, embeddings_gradients: List[np.ndarray], layer_name: str
) -> Any:
    """Register hook to get the gradient values from the embedding layer.

    Args:
        model: Model.
        embeddings_gradients: Variable to save values.
        layer_name: Name of the embedding layer.

    Returns:
        Hook.

    """

    def hook_layers(module, grad_in, grad_out):
        embeddings_gradients.append(grad_out[0].detach().cpu().clone().numpy())

    embedding_layer = find_word_embeddings_layer(model, layer_name)
    hook = embedding_layer.register_full_backward_hook(hook_layers)

    return hook


def get_saliency(
    saliency_grad: np.ndarray,
    embeddings: np.ndarray,
    gradient_calc: GradientCalculation = GradientCalculation.L2,
) -> List[float]:
    """Return the values corresponding to a saliency map.

    Args:
        saliency_grad: Gradient of the batch
        embeddings: Embedding of the batch
        gradient_calc: How to compute the saliency.

    Returns:
        Saliency values.

    Raises:
        ValueError: provided gradient_calc is invalid.

    """
    assert saliency_grad.shape == embeddings.shape  # num_tokens x 768

    # in order to have token importance be positive, multiply the gradient if need be
    multiplier = -1

    if gradient_calc == GradientCalculation.xABS_MAX:
        # Take the maximum absolute value across all embedding (768) dimensions
        saliency_grad = np.amax(np.abs(saliency_grad * embeddings), axis=1)
        multiplier = 1
    elif gradient_calc == GradientCalculation.xL2:
        # motivated by https://arxiv.org/abs/2009.13295, take the L2 norm across all dimensions
        saliency_grad = np.linalg.norm(saliency_grad * embeddings, ord=2, axis=1)
        multiplier = 1
    elif gradient_calc == GradientCalculation.L2:
        # motivated by https://arxiv.org/abs/2009.13295, take the L2 norm across all dimensions
        saliency_grad = np.linalg.norm(saliency_grad, ord=2, axis=1)
        multiplier = 1
    elif gradient_calc == GradientCalculation.xMIN:
        # Take the minimum value across all embedding (768) dimensions because the lowest
        # negative gradient for loss means the highest positive influence on class score
        saliency_grad = np.amin(saliency_grad * embeddings, axis=1)
    elif gradient_calc == GradientCalculation.xSUM:
        # Multiply gradient x embedding, then sum across rows (sum all dimensions for each token)
        saliency_grad = np.sum(saliency_grad * embeddings, axis=1)
    else:
        raise ValueError("Invalid way to get saliency")

    # Get the L1 norm to normalize across all tokens
    norm = np.linalg.norm(saliency_grad, ord=1)

    # negative gradient for loss means positive influence on decision
    saliency_values: List[float] = ((saliency_grad / norm) * multiplier).tolist()
    return saliency_values
