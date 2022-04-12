# Project configuration

This section describes high-level features about the project.

```python
class ProjectConfig(BaseSettings):
    # Name of the current project.
    name: str = Field("New project", env="NAME")
    # Dataset object definition.
    dataset: CustomObject
    # Which model_contract the application is using.
    model_contract: SupportedModelContract
    # Column names config in dataset
    columns: ColumnConfiguration = ColumnConfiguration()
    # Name of the rejection class.
    rejection_class: Optional[str] = "NO_INTENT"
```

### Name (Mandatory)

Any name can be set for the config. For example, it can represent the name of the dataset
and/or the model. Ex: `AskUbuntu Model v4`.

### Dataset (Mandatory)

This field describes which datasets we are using. Azumuth will load this description at runtime.
For example to load `banking77`, we would assign:

```json
"dataset": {
    "class_name": "datasets.load_dataset",
    "args": [
      "banking77"
    ]
  },
```
To load more complex datasets, please refer to our [Dataset API Contract](../api/dataset.md).

### Model Contract (Mandatory)

For now, we expect everyone will likely use one of either `hf_text_classification` or
`custom_text_classification`. See our [API Contract](../api/pipeline.md) for more information.

- `hf_text_classification` supports PyTorch classifier models (feedforward neural networks).
    - An example is provided in the repo under `config/examples/banking77`.
- `custom_text_classification` supports TensorFlow models with a GUSE or ELM embedding
  followed by a feedforward neural network.
    - Saliency values are not available with this contract, as the model uses a sentence embedding.

In the future, when supporting new ML tasks, such as AI Search or vision tasks, this field will
support additional values to accommodate different data and model types.

### Columns name

This tells Azimuth which columns from the datasets to read from.
Azimuth requires `text_input` and `label` to be present.

```python
class ColumnConfiguration(BaseModel):
    # Column for the preprocessed text input
    text_input: str = "utterance"
    # Optional Column for the raw text input
    raw_text_input: str = "utterance_raw"
    # Features column for the label
    label: str = "label"
    # Optional column to specify whether an example has failed preprocessing.
    failed_parsing_reason: str = "failed_parsing_reason"
```

### Rejection class

The field `rejection_class` in the config is validated and requires the class to be present in the dataset.
If your dataset doesn't have a "rejection_class" class, set the value to `None`.
