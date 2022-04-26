# Defining Dataset

In [:material-link: Project Config](../configuration/project.md) is described how a dataset needs to
be defined with a [:material-link: Custom Object](index.md) in the config. This section details how
to define the `class_name`, `args` and `kwargs` defined in the custom object.

## Dataset Definition

Azimuth supports the [HuggingFace Dataset API](https://huggingface.co/docs/datasets/access). The
loading function for the dataset must respect the following contract:

```python
from datasets import DatasetDict

from azimuth.config import AzimuthConfig


def load_your_dataset(azimuth_config: AzimuthConfig, **kwargs) -> DatasetDict:
    ...
```

!!! tip "Your don't have a HuggingFace `Dataset`?"

    If your dataset is not a HuggingFace `Dataset`, you can convert it easily using the following
    resources from HuggingFace:

    1. [from local files](https://huggingface.co/docs/datasets/loading#local-and-remote-files)
    2. [from in-memory data](https://huggingface.co/docs/datasets/loading#inmemory-data)

    We suggest following this
    [HuggingFace tutorial](https://huggingface.co/docs/datasets/dataset_script.html) to know more
    about dataset loading using Huggingface.

### Dataset splits

Azimuth expects the `train` and one of `validation` or `test` splits to be available. If
both `validation` and `test` are available, we will pick the former. The `train` is not mandatory for Azimuth to run.

## Column names and rejection class

Go to the [:material-link: Project Config](../configuration/project.md) to see other attributes that
should be set along with the dataset.

## Example

Using this API, we can load SST2, a sentiment analysis dataset.

**Note:** in this case, we can omit `azimuth_config` from the definition because we don't need it.

=== "azimuth_shr/loading_resources.py"

    ```python
    from datasets import DatasetDict, load_dataset


    def load_sst2_dataset(dataset_name: str) -> DatasetDict:
        datasets = load_dataset("glue", dataset_name)
        return DatasetDict(
            {"train": datasets["train"], "validation": datasets["validation"]}
        )
    ```
=== "Configuration file"

    ```json
    {
      "dataset": {
        "class_name": "loading_resources.load_sst2_dataset",
        "remote": "/azimuth_shr",
        "kwargs": {
          "dataset_name": "sst2"
        }
      },
      "columns": {
        "text_input": "sentence"
      },
      "rejection_class": null
    }
    ```

--8<-- "includes/abbreviations.md"
