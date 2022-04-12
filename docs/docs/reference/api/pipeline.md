# Pipeline

Pipelines take a batch of inputs and output a postprocessed prediction.

Azimuth differentiates between a Pipeline and a model.

A Pipeline:
* Is a composition of a model and its postprocessors
* Takes a batch of text and outputs a `PostProcessingIO`.

A Model:
* Takes a batch of text and outputs a `SupportedOutput`.

`PostProcessingIO` and `SupportedOutput` are defined below.
Beginner users should use their own models, but use Azimuth's postprocessors to ensure type safety.

#### Types

The types used in this document are defined as follows:

```python
from transformers import Pipeline
from azimuth.config import AzimuthConfig
from azimuth.modules.model_contracts.hf_text_classification import PipelineOutputProtocol
from azimuth.functional.postprocessing import PostProcessingIO

SupportedOutput = Union[PipelineOutputProtocol,
                        np.ndarray,  # Shape [N, num_classes]
                        Tensor,  # Shape [N, num_classes]
                        List[List[Dict]],  # Output of Pipeline with key "score"
                        transformers.file_utils.ModelOutput]
```


### Model definition

A model is defined as a function that takes an utterance as input and outputs a probability or a structured output (see
examples for more info).

```python
def load_model(azimuth_config: AzimuthConfig, **kwargs) -> Union[Pipeline, Callable]
    ...
```

When a `Pipeline` is returned, we expect it to contain `tokenizer: Tokenizer`
and `model: nn.Module`.

## Model contracts

To differentiate between the different types of pipelines, Azimuth uses a field named `model_contract`.
Users must enter the correct `model_contract` in the configuration file depending on their usecase.

### Huggingface Pipeline with Pytorch

| `model_contract`         | Model type           | Framework |
|--------------------------|----------------------|-----------|
| `hf_text_classification` | HuggingFace Pipeline | Pytorch   |

This is our canonical API. It currently supports all of our features and includes some optimization for HuggingFace
inference.

Model signature: `__call__(utterances: List[str], num_workers:int, batch_size:int) -> SupportedOutput`

### Other frameworks

| `model_contract`             | Model type | Framework |
|------------------------------|------------|-----------|
| `custom_text_classification` | Callable   | Any       |

This general purpose API can be used with any framework. The user-defined model is a `Callable` that returns predictions
from a list of strings.

Disabled features:

1. Saliency maps
2. Epistemic uncertainty estimation

Model signature: `__call__(utterances: List[str]) -> SupportedOutput`

### File-based

| `model_contract`                 | Model type | Framework |
|----------------------------------|------------|-----------|
| `file_based_text_classification` | Callable   | Any       |

Azimuth can also work without a model, but with predictions supplied in a file. To do so, we will
provide the row index of each utterance along with the sentence. The user should use the row index
as we will call the model with modified utterances. The predictions should be **after**
postprocessing.

Model
signature: `__call__(utterances: Dict[str, Any], dataset_split_name: DatasetSplitName) -> SupportedOutput`

where the `utterances` have the following keys:

1. `row_idx`: the indices for each row
2. `utterance`: as defined in `AzimuthConfig.columns.text_input`, the utterances.

Disabled features:

1. Saliency maps
2. Epistemic uncertainty estimation
3. Postprocessing sweeps


## Postprocessors

Postprocessors can be applied after any pipeline. By default, Azimuth applies thresholding at 0.5.

!!! tip
      To disable postprocessing manually, set `"postprocessors": null` in the config.

The API for a postprocessor is the following:

```python
def __call__(self, post_processing_io: PostProcessingIO) -> PostProcessingIO:
    ...
```
You can also extend `azimuth.functional.postprocessing.Postprocessing`,

To get consistent results, postprocessors **must** provide a valid `PostprocessingIO` at all time.
For example, if a postprocessor modifies the `logits`, it must recompute `probs` as well.

!!! tip

      Azimuth provides shortcuts for some common postprocessing.

      - For Temperature scaling : `"postprocessors": [{"temperature": 1}]`
      - For Thresholding : `"postprocessors": [{"threshold": 0.5}]`


## Examples

### HuggingFace Pipeline

This is how we would load a pretrained BERT model using this API:

=== "azimuth_shr/loading_resources.py"

    ``` python
    def load_text_classif_pipeline(checkpoint_path: str, azimuth_config: AzimuthConfig) -> Pipeline:
        log.info(f"Loading text classification model from {checkpoint_path} ...")
        use_cuda = azimuth_config.use_cuda
        model = AutoModelForSequenceClassification.from_pretrained(
              checkpoint_path, cache_dir=_CACHED_MODELS_DIR
        )
        tokenizer = AutoTokenizer.from_pretrained(
              checkpoint_path, use_fast=False, cache_dir=_CACHED_MODELS_DIR
        )
        device = 0 if use_cuda else -1

        # We set return_all_scores=True to get all softmax outputs
        return TextClassificationPipeline(
              model=model, tokenizer=tokenizer, device=device, return_all_scores=True
         )
    ```

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

### Custom Pipeline

For models coming from other frameworks, the loading function returns a `Callable`.


=== "azimuth_shr/loading_resources.py"

    ``` python
    def load_keras_model(checkpoint_path: str, azimuth_config: AzimuthConfig) -> Callable:
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

### Postprocessors

Let's define a postprocessor that will do Temperature scaling:

=== "azimuth_shr/loading_resources.py"

    ```python
    from azimuth.functional.postprocessing import PostProcessingIO
    from scipy.special import expit, softmax

    class TemperatureScaling:
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
    ```

=== "Configuration file"

    ``` json

    "pipelines": [
          {
            "model": ...,
            "postprocessors": [
                  {
                    "class_name": "loading_resources.TemperatureScaling",
                    "remote": "/azimuth_shr",
                    "kwargs": {"temperature": 3}
                  }
                 ]
         }
      ]
    ```

### Supported output without postprocessing

We support multiple output formats that are **not** postprocessed.
We will run the postprocessing defined in the configuration.

If you have your own postprocessing, please see the "Postprocessed outputs" section below.

```python
import tensorflow as tf
import torch
import numpy as np
NUM_SAMPLES = 10
NUM_CLASSES = 2

probs = softmax(np.random.rand(NUM_SAMPLES, NUM_CLASSES), -1)

# Valid examples

probs # Numpy array Shape [N, num_classes]
torch.from_numpy(probs)# Tensor, # Shape [N, num_classes]
tf.convert_to_tensor(probs)
[[{"score": i} for i in distribution] for distribution in probs] # List[List[Dict]] Output of Pipeline with key "score"
```

### Postprocessed outputs

For custom postprocessing, the model can output `PipelineOutputProtocol`
which provides the postprocessed output as well as the raw output.

In your code, you don't have to extend `PipelineOutputProtocol`; you can use your own library, and as long as the fields
match, Azimuth will accept it. This is done so that our users don't have to add Azimuth as a dependency.

```python
@dataclass
class PostprocessingData:
    texts: List[str]  # len [num_samples]
    logits: np.ndarray  # shape [num_samples, classes]
    preds: np.ndarray  # shape [num_samples]
    probs: np.ndarray  # shape [num_samples, classes]


### Valid

class MyPipelineOutput(BaseModel):  # Could be dataclass as well.
    model_output: PostprocessingData
    postprocessor_output: PostprocessingData


### Invalid because the field names do not match

class MyPipelineOutput(BaseModel):
    predictions: MyPipelineOutput
    postprocessed_predictions: MyPipelineOutput
```

--8<-- "includes/abbreviations.md"
