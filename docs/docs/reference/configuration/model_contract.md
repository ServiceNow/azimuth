# Model Contract Config

Fields from this scope defines how Azimuth interacts with the ML pipelines and the metrics.

=== "Class Definition"

    ```python
    from typing import Dict, List, Optional

    from azimuth.config import MetricDefinition, PipelineDefinition,
        UncertaintyOptions
    from azimuth.types import SupportedModelContract


    class ModelContractConfig:
        model_contract: SupportedModelContract = SupportedModelContract.hf_text_classification # (1)
        pipelines: Optional[List[PipelineDefinition]] = None # (2)
        uncertainty: UncertaintyOptions = UncertaintyOptions() # (3)
        saliency_layer: Optional[str] = None # (4)
        metrics: Dict[str, MetricDefinition] = { # (5)
            "Precision": MetricDefinition(
                class_name="datasets.load_metric",
                kwargs={"path": "precision"},
                additional_kwargs={"average": "weighted"},
            ),
            "Recall": MetricDefinition(
                class_name="datasets.load_metric",
                kwargs={"path": "recall"},
                additional_kwargs={"average": "weighted"},
            ),
            "F1": MetricDefinition(
                class_name="datasets.load_metric",
                kwargs={"path": "f1"},
                additional_kwargs={"average": "weighted"},
            ),
        }
    ```

    1. `model_contract` needs to be chosen based on the model type.
    2. List of pipelines. Can also be set to `null` to launch Azimuth with a dataset only.
    3. Enable uncertainty quantification.
    4. Layer name where to calculate the gradients, normally the word embeddings layer.
       Only available for Pytorch models.
    5. HuggingFace Metrics.

=== "Config Example"

    ```json
    {
      "model_contract": "hf_text_classification",
      "pipelines": [
        {
          "model": {
            "class_name": "loading_resources.load_hf_text_classif_pipeline",
            "remote": "/azimuth_shr",
            "kwargs": {
              "ckpt_path": "distilbert-base-uncased-finetuned-sst-2-english"
            }
          }
        }
      ]
    }
    ```

## Model Contract

🟠 **Mandatory field** with an ML pipeline.

**Default value**: `hf_text_classification`

The model contract will be determined based on the model type. More details on what model contract
to select based on the model is available
in [:material-link: Define a Model](../custom-objects/model.md).

* `hf_text_classification` supports `transformers.Pipeline` from HF. Examples are provided in the
  repo under `config/examples`.
* `custom_text_classification` supports any `Callable` and is more generic. Some features from
  Azimuth will be unavailable, such as saliency maps.
* `file_based_text_classification` supports reading the predictions from a file. A lot of features
  from Azimuth will be unavailable, such as behavioral testing and saliency maps.

## Pipelines

🟠 **Mandatory field** with an ML pipeline.

**Default value**: `None`

In Azimuth, we define an ML pipeline as the combination of a model and postprocessors. This field
accepts a list, since multiple pipelines can be loaded in Azimuth. If set to `null`, Azimuth will be
launched without any pipeline.

=== "Pipeline Definition"

    ```python
    from typing import List, Optional, Union

    from pydantic import BaseSettings, Field

    from azimuth.config import CustomObject, TemperatureScaling, ThresholdConfig


    class PipelineDefinition(BaseSettings):
        name: str # (1)
        model: CustomObject # (2)
        postprocessors: Optional[ # (3)
            List[Union[TemperatureScaling, ThresholdConfig, CustomObject]]
        ] = Field([ThresholdConfig(threshold=0.5)], nullable=True)
    ```

    1. Add a name to the pipeline to easily recognize it from the webapp.
    Ex: `distilbert-base-uncased-th-0.9`
    2. Azimuth offers a helper function for HF pipelines. See the config example.
    3. The default postprocessors in Azimuth is a temperature of 1 and a threshold of 0.5. They
    can be changed (Ex: `postprocessors: [{"temperature": 3}]`), disabled (`postprocessors: null`),
    or replaced with new ones defined with custom objects.

=== "Config Example"

    If using a `transformers.Pipeline` from HF, the configuration below should work.

    ```json
    {
      "pipelines": [
        {
          "name": "distilbert-base-uncased-th-0.9"
          "model": {
            "class_name": "loading_resources.load_hf_text_classif_pipeline",
            "remote": "/azimuth_shr",
            "kwargs": {
              "ckpt_path": "distilbert-base-uncased-finetuned-sst-2-english"
            }
          "postprocessors": [
            {
              "threshold": 0.9
            }
          ]
        }
      ]
    }
    ```

=== "No Pipelines"

    This will launch Azimuth without any pipelines. Dataset Analysis is still available.

    ```json
    {
      "pipelines": null
    }
    ```

Both the model and the postprocessors are defined with [:material-link: **Custom
Objects**](index.md).

* **`model`** allows to define a model. The model can be a HuggingFace pipeline, or any callable.
  The model can even include its own
  post-processing. [:material-link: Defining a Model](../custom-objects/model.md)
  details how to do that with custom objects.
* **`postprocessors`** defines the postprocessors. Azimuth offers some default values for
  temperature scaling and thresholding. Users can also provide their own postprocessor functions, or
  disabled them (`postprocessors: null`).
  [:material-link: Defining Processors](../custom-objects/processors.md) details the
  different use cases.

!!! tip "Beginner users should start with simple use cases"

    Beginner users should aim to use Azimuth's default supported `postprocessors`: temperature
    scaling and thresholding. We provide shortcuts to override the default values.
    Ex: `{"postprocessors": [{"temperature": 3, "threshold": 0.9}]}`. You can also use environment
    variable `TEMP` and `TH`. Ex: `TH=0.6`.

## Uncertainty

🔵 **Default value**: `UncertaintyOptions()`

Azimuth has some simple uncertainty estimation capabilities. By default, they are disabled given
that it can be computationally expensive.

On any model, we can provide the entropy of the predictions which is an approximation of the
predictive uncertainty. In addition, we can tag high epistemic items above a threshold. More
information on how we compute uncertainty is available
in [:material-link: Uncertainty Estimation](../../key-concepts/uncertainty.md).

=== "Class Definition"

    ```python

    from pydantic import BaseModel


    class UncertaintyOptions(BaseModel):
        iterations: int = 1  # (1)
        high_epistemic_threshold: float = 0.1  # (2)
    ```

    1. Number of MC sampling to do. The default is 1, which disables BMA.
    2. Threshold to determine high epistemic items.

=== "Config Example"

    ```json
    {
      "uncertainty": {
        "iterations": 20
      }
    }
    ```

## Saliency Layer

🟡 **Default value**: `None`

If using a Pytorch model, [:material-link: Saliency Maps](../../key-concepts/saliency.md) can be
available. Specify the name of the embedding layer on which to compute them.

Example: `distilbert.embeddings.word_embeddings`.

## Metrics

🔵 **Default value**: Accuracy, Precision, Recall and F1. See in the config example below.

By default, Azimuth will compute the metrics listed above. `metrics` leverages custom
objects, with an additional field which allow defining `kwargs`
to be sent to the metric `compute()` function.

You can add metrics available from
the [HuggingFace Metric Hub](https://github.com/huggingface/datasets/tree/master/metrics), or create
your own, as detailed in [:material-link: Defining Metrics](../custom-objects/metric.md)
.

=== "Metric Definition"

    ```python
    from typing import Dict

    from pydantic import Field

    from azimuth.config import CustomObject


    class MetricDefinition(CustomObject):
        additional_kwargs: Dict = Field(
            default_factory=dict,
            title="Additional kwargs",
            description="Keyword arguments supplied to `compute`",
        )
    ```

=== "Config Example"

    These are the default values. This example shows how this could be adapted to other metrics.

    ```json
    {
      "metrics": {
        "Accuracy": {
          "class_name": "datasets.load_metric",
          "kwargs": {
            "path": "accuracy"
          }
        },
        "Precision": {
          "class_name": "datasets.load_metric",
          "kwargs": {
            "path": "precision"
          },
          "additional_kwargs": {
            "average": "weighted"
          }
        },
        "Recall": {
          "class_name": "datasets.load_metric",
          "kwargs": {
            "path": "recall"
          },
          "additional_kwargs": {
            "average": "weighted"
          }
        },
        "F1": {
            "class_name":"datasets.load_metric",
            "kwargs": {
              "path": "f1"
            },
            "additional_kwargs": {
              "average": "weighted"
            }
        }
      }
    }
    ```

--8<-- "includes/abbreviations.md"
