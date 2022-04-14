# Defining Postprocessors

Postprocessors can be applied after any model in Azimuth.

## Default Postprocessors in Azimuth

By default, Azimuth applies thresholding at 0.5. It also supports Temperature Scaling.

Azimuth provides shortcuts to override the threshold and the temperature. Add this as postprocessors
in the `PipelineDefinition`.

- For Temperature Scaling : `{"postprocessors": [{"temperature": 1}]}`
- For Thresholding : `{"postprocessors": [{"threshold": 0.5}]}`

## Model with its own postprocessing

If your model already includes postprocessing, as explained
in [:material-link: Define a Model](model.md), the model prediction signature needs to have a
specific output, `PipelineOutputProtocol`, that will contain both the predictions from the model,
and the post-processed predictions.

```python
from typing import Protocol

from azimuth.utils.ml.postprocessing import PostProcessingIO


class PipelineOutputProtocol(Protocol):
    """Class containing result of a batch"""

    model_output: PostProcessingIO  # (1)
    postprocessor_output: PostProcessingIO  # (2)
```

1. model output before passing through post-processing stage: texts, logits, probs, preds
2. output after passing through post-processing: pre-processed texts, logits, probs, preds

`PostProcessingIO` is defined as the following.

```python
from typing import List

from azimuth.types.general.alias_model import AliasModel
from azimuth.types.general.array_type import Array


class PostProcessingIO(AliasModel):
    texts: List[str]  # (1)
    logits: Array[float]  # (2)
    preds: Array[int]  # (3)
    probs: Array[float]  # (4)
```

1. The utterance text. Length of `N`
2. Logits of the model. Shape of `(N, C)`
3. Predicted class, `argmax`of probabilities. Shape of `(N, 1)`
4. Probabilities of the model # Shape of `(N, C)`

In your code, you don't have to extend `PipelineOutputProtocol` or `PostProcessingIO`; you can use
your own library, and as long as the fields match, Azimuth will accept it. This is done so that our
users don't have to add Azimuth as a dependency.

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

### In the Config

`{"postprocessors": null}` should then be added to the config, to avoid re-postprocessing in
Azimuth.
## User-Defined Postprocessors

Similarly to a model and a dataset, users can add their own postprocessors in Azimuth with custom
objects. However, some typing needs to be respected for Azimuth to handle it.

First, the post-processing class needs `PostProcessingIO`, as defined above, as both input and
output. To get consistent results, all values need to be updated by the post-processors. For
example, if a postprocessor modifies the `logits`, it must recompute `probs` as well.

The API for a postprocessor is the following:

```python
from azimuth.utils.ml.postprocessing import PostProcessingIO


def __call__(self, post_processing_io: PostProcessingIO) -> PostProcessingIO:
    ...
```

You can also extend `azimuth.utils.ml.postprocessing.Postprocessing` to write your own
postprocessor.

### Example

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
                softmax(new_logits, axis=1) if post_processing_io.is_multiclass
                                            else expit(new_logits)
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

--8<-- "includes/abbreviations.md"
