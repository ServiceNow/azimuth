# Model contract fields

Fields that describe how Azimuth interacts with the pipelines are described here.

```python
class ModelContractConfig:
    # Which model_contract the application is using.
    model_contract: SupportedModelContract
    # Model object definition.
    pipelines: Optional[List[PipelineDefinition]] = None
    # Uncertainty configuration
    uncertainty: UncertaintyOptions = UncertaintyOptions()
    # Layer name where to calculate the gradients, normally the word embeddings layer.
    saliency_layer: Optional[str] = None
    # Custom HuggingFace metrics
    metrics: Dict[str, MetricDefinition] = ...
```

### Model Contract (Mandatory)

For now, we expect everyone will likely use one of either `hf_text_classification` or
`custom_text_classification`. See our [API Contract](../api/pipeline.md) for more information.

- `hf_text_classification` supports PyTorch classifier models (feedforward neural networks).
    - An example is provided in the repo under `config/examples/banking77`.
- `custom_text_classification` supports any other type of models (Tensorflow, Jax, sklearn).
    - Saliency values are not available with this contract, as the model uses a sentence embedding.

In the future, when supporting new ML tasks, such as AI Search or vision tasks, this field will
support additional values to accommodate different data and model types.

### Pipelines

Pipelines are a composition of a model and its postprocessing. To know how to create your own
pipelines, please see our [Pipelines API Contract](../api/pipeline.md).

### Uncertainty estimation

Azimuth has some simple uncertainty estimation capabilities. On any model, we provide the entropy of
the predictions which is an approximation of the predictive uncertainty. In addition, we can tag
high epistemic items above a threshold. More information on how we compute uncertainty is
available [:material-link: here](../../key-concepts/uncertainty.md).

```python
class UncertaintyOptions(BaseModel):
    iterations: int = 1  # Number of MC sampling to do. 1 disables BMA.
    high_epistemic_threshold: float = 0.1  # Threshold to determine high epistemic items.
```

### Saliency Layer

In addition to the `model` definition, we need to know the name of the embedding layer to compute
the [:material-link: saliency maps](../../key-concepts/saliency.md).
Example: `distilbert.embeddings.word_embeddings`. This only needs to be specified for models which
have saliency available.

### Metrics

By default, Azimuth will compute Precision and Recall on the dataset. To include more metrics, you
can edit this fields.

To learn how to supply your own metrics, please see our [Metrics API Contract](../api/metric.md).
