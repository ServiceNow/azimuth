# Custom Objects

Azimuth uses Custom Objects to define how to integrate with models, datasets and metrics. Custom
Objects are instantiated at runtime to load the object; the ML pipeline function will return a
pipeline, and the Dataset function will return the dataset.

Our primary integration is through [HuggingFace](https://huggingface.co/), but Azimuth supports any
other type of dataset or model.

* [Defining Datasets](dataset.md)
* [Defining a Model](model.md)
* [Defining Postprocessors](postprocessors.md)
* [Defining Metrics](metric.md)

## What is a Custom Object?

A `CustomObject` is simply a path to a function and its arguments. When users supply their custom
object functions and classes, they should be added to `azimuth_shr`, as it is already mounted at
startup on the Docker image.

```python
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field


class CustomObject(BaseModel):
    class_name: str = Field(..., title="Class name to load")
    args: List[Union["CustomObject", Any]] = []
    kwargs: Dict[str, Union["CustomObject", Any]] = {}
    remote: Optional[str] = None  # (1)
```

1. Relative path to `class_name`.

`class_name` is the name of the function or class that is located in `remote`. `args` and `kwargs`
will be sent to the function/class.

### Example

Here is in example of two Custom Objects. In `azimuth_shr/loading_resources.py`, we will add two
functions which will load a model and a dataset. The configuration file will then be defined as
follows.

=== "`azimuth_shr/loading_resources.py`"

    ```python
    import transformers
    import datasets


    def my_model(ckpt_path) -> transformers.Pipeline:
        pipeline = ...  # Load the pipeline from ckpt_path
        return pipeline


    def my_dataset(ckpt_path) -> datasets.DatasetDict:
        dataset = ...  # Load the Dataset from ckpt_path
        return dataset
    ```

=== "Config Example"

    ```python
    {
      "dataset": {
        "class_name": "loading_resources.my_dataset",
        "remote": "/azimuth_shr",
        "kwargs": {
          "ckpt_path": "/azimuth_shr/data/my_dataset" # (1)
        }
      },
      "pipelines": [
        {
          "model": {
            "class_name": "loading_resources.my_model",
            "remote": "/azimuth_shr",
            "kwargs": {
              "ckpt_path": "distilbert-base-uncased-finetuned-sst-2-english"
            }
          }
        }
      ]
    }
    ```

    1. Path to the dataset. Should be put under `/azimuth_shr` so it is mounted on the Docker image
    automatically.

### Using the Config

If the function has an argument named `azimuth_config`, Azimuth will supply the config file to the
function automatically. This can be useful if some attributes from the config are needed.

```python
from azimuth.config import AzimuthConfig

# This is fine.
def my_model(num_classes, azimuth_config: AzimuthConfig):
    pass


# Also fine
def my_model(num_classes):
    pass
```

--8<-- "includes/abbreviations.md"
