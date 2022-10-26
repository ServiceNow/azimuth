# Defining Processors

- **Preprocessors** cannot be defined in Azimuth, but if they are included in the [user pipeline](#pipeline-with-processing), the tool can display the results of the preprocessing steps.
- **Postprocessors** can be included as part of the [user pipeline](#pipeline-with-processing), similar to preprocessors, and defined in Azimuth, either by leveraging the [default postprocessors](#default-postprocessors), or [defining new ones](#user-defined-postprocessors).

## Default Postprocessors

By default, Azimuth applies thresholding at 0.5. It also supports Temperature Scaling.

Azimuth provides shortcuts to override the threshold and the temperature. Add this as postprocessors
in the `PipelineDefinition`.

- For Temperature Scaling : `{"postprocessors": [{"temperature": 1}]}`
- For Thresholding : `{"postprocessors": [{"threshold": 0.5}]}`

## Pipeline with Processing

If your pipeline already call preprocessing and/or postprocessing steps, as explained
in [:material-link: Define a Model](model.md), the model prediction signature needs to have a
specific output, `PipelineOutputProtocol` or `PipelineOutputProtocolV2`.

Both classes need to contain the model and post-processed predictions.
The difference between both classes is the presence of two extra fields in V2, that allows to
return the intermediate results of the preprocessing and postprocessing steps, so that they can be
displayed in the UI.

=== "PipelineOutputProtocol"

    ```python
    from typing import Protocol

    from azimuth.utils.ml.postprocessing import PostProcessingIO


    class PipelineOutputProtocol(Protocol):
        """Class containing result of a batch"""
        model_output: PostProcessingIO  # (1)
        postprocessor_output: PostProcessingIO  # (2)
    ```

    1. model output before passing through post-processing: texts, logits, probs, preds
    2. output after passing through post-processing: pre-processed texts, logits, probs, preds

=== "PipelineOutputProtocolV2"

    ```python
    from typing import Protocol

    from azimuth.utils.ml.postprocessing import PostProcessingIO


    class PipelineOutputProtocolV2(Protocol):
    """Class containing result of a batch with pre and postprocessing steps"""
        model_output: PostProcessingIO # (1)
        postprocessor_output: PostProcessingIO # (2)
        preprocessing_steps: List[Dict[str, Union[str, List[str], int]]] # (3)
        postprocessing_steps: List[Dict[str, Union[str, PostProcessingIO, int]]] # (4)
    ```

    1. model output before passing through post-processing: texts, logits, probs, preds
    2. output after passing through post-processing: pre-processed texts, logits, probs, preds
    3. list of preprocessing steps with the intermediate results. See Preprocessing Steps below.
    4. list of postprocessing steps with the intermediate results. See Postprocessing Steps below.

`PostProcessingIO` is defined as the following.

```python
from typing import List

from azimuth.types import AliasModel, Array


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

!!! example

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

### `PipelineOutputProtocolV2`
If using V2, to new fields need to be provided: preprocessing steps and postprocessing steps.

The preprocessing steps need to be returned as a a `List` of `Dict` with the following fields and types.

=== "Dict Fields and Types"

    ```python
    from typing import List

    class_name: str  # (1)
    text: List[str]  # (2)
    order: int # (3)
    ```

    1. Name of the pre-processing step, usually the name of the Python class.
    2. Text of the utterance after the pre-processing step.
    3. Order of the pre-processing step.

=== "Example"

    ```python
    [
        {
            'class_name': 'PunctuationRemoval',  # (1)
            'text': ['Test'],  # (2)
            'order': 1 # (3)
        },
        {
            'class_name': 'LowerCase',
            'text': ['test'],
            'order': 2
        }
    ]
    ```

The postprocessing steps also need to be returned as a `List` of `Dict` with the following fields and types.

=== "Dict Fields and Types"

    ```python
    from typing import List

    class_name: str  # (1)
    output: PostProcessingIO  # (2)
    order: int # (3)
    ```

    1. Name of the post-processing step, usually the name of the Python class.
    2. Prediction results after this step.
    3. Order of the post-processing step.

=== "Example"

    ```python
    [
        {
            'class_name': 'TemperatureScaling',
            'output': PostprocessorOutput(
                texts='',
                logits=array([[-0.20875366 -0.25494186]], dtype=float32),
                probs=array([[0.511545 0.488455]], dtype=float32),
                preds=array([0])),
            'order': 0
        },
        {
            'class_name': 'Thresholding',
            'output': PostprocessorOutput(
                texts=None,
                features=None,
                logits=array([[-0.20875366 -0.25494186]], dtype=float32),
                probs=array([[0.511545 0.488455]], dtype=float32),
                preds=array([2])),
            'order': 1
        }
    ]
    ```

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
