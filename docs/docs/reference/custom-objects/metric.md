# Defining Metrics

Azimuth builds upon
the [HuggingFace Metric API](https://huggingface.co/docs/datasets/loading_metrics.html). Please
refer to [HuggingFace Metric Hub](https://github.com/huggingface/datasets/tree/master/metrics)
that details all available metrics that can be added to Azimuth.

## Metric definition

A metric definition is a simple [Custom Object](../index.md) that loads a HuggingFace metric.

The metric custom object has an extra-field `additional_kwargs` that will be pass to the `compute()`
function of the HuggingFace metric. This will be required for some metrics, as shown in the example
with precision, recall and F1 below.

=== "Metric Definition"

    ```python
    from typing import Dict

    from pydantic import Field

    from azimuth.config import CustomObject


    class MetricDefinition(CustomObject):
        additional_kwargs: Dict = Field(
            default_factory=dict,
            title="Additional kwargs",
            description="Keyword arguments supplied to `compute`.",
        )
    ```

=== "Config Example"

    ``` json
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

### Custom Metrics

For more experienced users, HuggingFace presents how to create custom metrics in
this [tutorial](https://huggingface.co/docs/datasets/v2.0.0/en/how_to_metrics).

For custom metrics, Azimuth supplies probabilities when possible. The `compute` method must follow
this signature:

```python
from typing import Any, Dict, List

import numpy as np


def _compute(
        self,
        predictions: List[int],  # (1)
        references: List[int],  # (2)
        probabilities: np.ndarray,  # (3)
) -> Dict[str, Any]:  # (4)
    ...
```

1. Predicted labels (1 class per sample).
2. Ground truth labels.
3. Probabilities computed by the pipeline.
4. A dictionary with the computed values.

--8<-- "includes/abbreviations.md"
