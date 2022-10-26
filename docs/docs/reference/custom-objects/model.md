# Defining a Model

A model is defined as a function that takes an utterance as input and outputs a `SupportedOutput`
(defined below). Some models will output probabilities, whereas other models are "pipelines" which
include pre-processing and/or post-processing steps. Azimuth supports both these use cases. The `model_contract` field
from the config will determine how Azimuth will interface with the model, as detailed in this
section.

## Model Definition

In the config, the custom object for the model defines the class that will load the model.

```python
from typing import Union, Callable

from transformers import Pipeline

from azimuth.config import AzimuthConfig


def load_model(azimuth_config: AzimuthConfig, **kwargs) -> Union[Pipeline,
                                                                 Callable]:
    ...
```

The output of the function (`transformers.Pipeline` or `Callable`) will determine
the `model_contract` that should be used.

When a [`transformers.Pipeline`](https://huggingface.co/docs/transformers/main_classes/pipelines)
from HF is returned, we expect it to contain `tokenizer: Tokenizer`
and `model: nn.Module`.

## Model Prediction Signature

The inputs of the model prediction signature will change based on the `model_contract`. However, the
supported outputs are the same for all model contracts.

### Supported Output

```python
from typing import Union

import numpy as np
import transformers
from torch import Tensor  # (1)

from azimuth.modules.model_contracts.text_classification import (
    PipelineOutputProtocol, PipelineOutputProtocolV2)

SupportedOutput = Union[np.ndarray,
                        Tensor,
                        transformers.file_utils.ModelOutput,
                        PipelineOutputProtocol,
                        PipelineOutputProtocolV2]
```

1. `Tensor` from `TensorFlow` is also supported.

If the model does not have its own postprocessing, the supported output should be one of the 3 first
outputs listed above, as shown in the example below.

#### Example

Assuming the following function, the table below shows how to transform `probs` in the 3 first
supported outputs.

```python
import numpy as np
from scipy.special import softmax

NUM_SAMPLES = 10
NUM_CLASSES = 2

probs = softmax(np.random.rand(NUM_SAMPLES, NUM_CLASSES), -1)
```

| Supported Output                 | Example | Shape |
|----------------------------------|------------|------------|
| `np.ndarray` | `probs`| `[N, num_classes]` |
| ` Tensor` | `torch.from_numpy(probs)` or  `tf.convert_to_tensor(probs)` | `[N, num_classes]` |
| `ModelOutput`| `SequenceClassifierOutput(logits=torch.log(probs))`  | NA |

If your model already includes post-processing, or if you decide to create your own post-processing
in Azimuth (we already support thresholding and temperature scaling), it will need to output
a `PipelineOutputProtocol` or `PipelineOutputProtocolV2`. More details can be found in [Define Postprocessors](postprocessors.md).

## Model contracts

To differentiate between the different types of models, Azimuth uses a field named
`model_contract`.

| `model_contract`                 | Model type | Framework |
|----------------------------------|------------|-----------|
| `hf_text_classification` | HuggingFace Pipeline | Supported by HF   |
| `custom_text_classification` | Callable   | Any       |
| `file_based_text_classification` | Callable   | Any       |

### HuggingFace Pipeline

| `model_contract`         | Model type           | Framework |
|--------------------------|----------------------|-----------|
| `hf_text_classification` | HuggingFace Pipeline | Supported by HF*   |

*Saliency maps are only available for Pytorch models.

This is our canonical API. It currently supports all of our features and includes some optimization
for HuggingFace inference.

#### Model Definition

In the config, the custom object for the model should return a `transformers.Pipeline`.

```python
from transformers import Pipeline

from azimuth.config import AzimuthConfig


def load_model(azimuth_config: AzimuthConfig, **kwargs) -> Pipeline:
    ...
```

For most use cases, `loading_resources.load_hf_text_classif_pipeline` will work.

#### Model Prediction Signature

The prediction signature is the one from `transformers`. We will supply the following arguments:

```python
from typing import List

from azimuth.modules.model_contracts.text_classification import SupportedOutput


def __call__(utterances: List[str], num_workers: int,
             batch_size: int) -> SupportedOutput:
    ...
```

#### Example

This is how we would load a pretrained BERT model using this API:

=== "azimuth_shr/loading_resources.py"

    ```python
    from transformers import (
        AutoModelForSequenceClassification,
        AutoTokenizer,
        Pipeline,
        TextClassificationPipeline,
    )

    from azimuth.config import AzimuthConfig
    from azimuth_shr.loading_resources import _should_use_cuda

    def load_text_classif_pipeline(checkpoint_path: str,
                                   azimuth_config: AzimuthConfig) -> Pipeline:
        model = AutoModelForSequenceClassification.from_pretrained(checkpoint_path)
        tokenizer = AutoTokenizer.from_pretrained(checkpoint_path, use_fast=False)
        device = 0 if _should_use_cuda(azimuth_config) else -1

        return TextClassificationPipeline(
            model=model, tokenizer=tokenizer, device=device,
            return_all_scores=True)  # (1)
    ```

    1. We set `return_all_scores=True` to get all softmax outputs.

=== "Configuration file"

    ``` json
    "model_contract": "hf_text_classification",
    "pipelines": [
          {
            "model": {
              "class_name": "loading_resources.load_text_classif_pipeline",
              "remote": "/azimuth_shr",
              "kwargs": {
                "checkpoint_path": "/azimuth_shr/files/clinc/CLINC150_trained_model"
              }
            }
          }
      ]
    ```

Examples are also provided in the repo under `config/examples`.

### Other frameworks

| `model_contract`             | Model type | Framework |
|------------------------------|------------|-----------|
| `custom_text_classification` | Callable   | Any       |

This general purpose API can be used with any framework.

#### Model Definition

The user-defined model is a `Callable` that returns predictions from a list of strings.

```python
from typing import Callable

from azimuth.config import AzimuthConfig


def load_model(azimuth_config: AzimuthConfig, **kwargs) -> Callable:
    ...
```

#### Model Prediction Signature

When the model is called with a list of utterances, it should return a prediction for each
utterance.

```python
from typing import List

from azimuth.modules.model_contracts.text_classification import SupportedOutput


def __call__(utterances: List[str]) -> SupportedOutput:
    ...
```

#### Disabled features

1. Saliency maps
2. Epistemic uncertainty estimation

#### Example

For models coming from other frameworks, the loading function returns a `Callable`.

=== "azimuth_shr/loading_resources.py"

    ``` python
    def load_keras_model(checkpoint_path: str,
                         azimuth_config: AzimuthConfig) -> Callable:
        model = tf.keras.models.load_model(checkpoint_path)
        return model
    ```

=== "Configuration file"

    ``` json
    "model_contract": "custom_text_classification",
    "pipelines": [
          {
            "model": {
              "class_name": "loading_resources.load_keras_model",
              "remote": "/azimuth_shr",
              "kwargs": {
                "checkpoint_path": "/azimuth_shr/files/clinc/keras_clinc_model"
              }
            }
          }
      ]
    ```

### File-based

| `model_contract`                 | Model type | Framework |
|----------------------------------|------------|-----------|
| `file_based_text_classification` | Callable   | Any       |

Azimuth can also work without a model, but with predictions supplied in a file. To do so, when
calling the prediction function, Azimuth will provide the row index of each utterance along with the
sentence. The predictions should be **after** postprocessing.

#### Model Definition

In `azimut_shr/models/file_based.FileBasedModel` is given the class that can be used to load
file-based models.

#### Model Prediction Signature

```python
from typing import Any, Dict

from azimuth.modules.model_contracts.text_classification import SupportedOutput
from azimuth.types import DatasetSplitName


def __call__(utterances: Dict[str, Any],
             dataset_split_name: DatasetSplitName) -> SupportedOutput:
    ...
```

where the `utterances` have the following keys:

1. `row_idx`: the indices for each row.
2. `utterance`: utterances as defined in `AzimuthConfig.columns.text_input`.

#### Disabled features

1. Saliency maps
2. Epistemic uncertainty estimation
3. Threshold Comparison

#### Example

```json
{
  "model_contract": "file_based_text_classification",
  "pipelines": [
    {
      "model": {
        "class_name": "models.file_based.FileBasedModel",
        "remote": "/azimuth_shr",
        "kwargs": {
          "test_path": "/azimuth_shr/path_to_your_prediction_file"
        }
      }
    }
  ]
}
```

--8<-- "includes/abbreviations.md"
