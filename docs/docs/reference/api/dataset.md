# Dataset

Azimuth supports the HuggingFace Dataset API. The loading function for the dataset must respect the following contract:

```python
from datasets import DatasetDict
def load_your_dataset(azimuth_config: AzimuthConfig, **kwargs) -> DatasetDict:
    ...
```

If your dataset is not a HuggingFace Dataset, you can convert it easily using the following resources:

1. [from local files](https://huggingface.co/docs/datasets/loading#local-and-remote-files)
2. [from in-memory data](https://huggingface.co/docs/datasets/loading#inmemory-data)

We suggest following
this [HuggingFace tutorial](https://huggingface.co/docs/datasets/dataset_script.html)
to know more about dataset loading using Huggingface.

## Dataset splits

Azimuth expects the `train` and one of `validation` or `test` splits to be available. If both `validation` and `test` are
available, we will pick the former.

## Columns

All column names are configurable. Our default names and their descriptions are as follows:

| Field name | Default   | Description                                                       |
|------------|-----------|-------------------------------------------------------------------|
 | text_input | utterance | The preprocessed utterance.                                       |
 | label      | label     | The class label for the utterance, as type `datasets.ClassLabel`. |

## Examples

Using this API, we can load SST2, a sentiment analysis dataset.

**Note:** in this case, we can omit `azimuth_config` from the definition because we don't need it.


=== "azimuth_shr/loading_resources.py"

    ``` python
    def load_sst2_dataset(dataset_name: str) -> DatasetDict:
        log.info(f"Loading dataset {dataset_name}...")
        datasets = load_dataset("glue", dataset_name)
        return DatasetDict(
           {"train": datasets["train"], "validation": datasets["validation"]}
        )
    ```
=== "Configuration file"

    ``` json
    "dataset": {
              "class_name": "loading_resources.load_sst2_dataset",
              "remote": "/azimuth_shr",
              "kwargs": {
                "dataset_name": "sst2"
              }
            }
    },
    "columns" {"text_input" : "sentence"}
    ```

--8<-- "includes/abbreviations.md"
