# Azimuth API Contract

This contract defines how to integrate models, datasets or metrics in Azimuth.

Our primary API is through [HuggingFace](https://huggingface.co/), but Azimuth supports any other type of dataset or model.

Azimuth works with `CustomObject` instantiated at runtime to load an object; i.e., the Pipeline function should
return a pipeline, and the Dataset function should return the dataset.

* [Defining Pipelines](pipeline.md)
* [Defining Datasets](dataset.md)
* [Defining Metrics](metric.md)

## Defining CustomObject

CustomObject are simply a path to a function and its arguments.
We suggest that custom code be put in `azimuth_shr` as it is already mounted at startup.

In the file named `loading_resources.py`, we add two functions, which will load a model and a dataset.

```python
# azimuth_shr/loading_resources.py
import transformers
import datasets


def my_model(ckpt_path) -> transformers.Pipeline:
    pipeline = ...  # Load the pipeline from ckpt_path
    return pipeline


def my_dataset(ckpt_path) -> datasets.DatasetDict:
    dataset = ...  # Load the Dataset from ckpt_path
    return dataset
```

The model is defined in the configuration file as follow:

```json
"pipelines": [{
  "class_name": "loading_resources.my_model",
  "remote": "/azimuth_shr",
  "kwargs": {
    "ckpt_path": "distilbert-base-uncased-finetuned-sst-2-english"
  }
}]
```

and similarly the dataset with:

```json
"dataset": {
  "class_name": "loading_resources.my_dataset",
  "remote": "/azimuth_shr",
  "kwargs": {
    "ckpt_path": "/data/my_dataset"
  }
}
```

!!! note

    Azimuth will supply its configuration to the function if the function has an argument named `azimuth_config`.
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
