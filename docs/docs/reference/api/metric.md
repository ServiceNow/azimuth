# Metric

Azimuth builds upon the [Huggingface Metric API](https://huggingface.co/docs/datasets/loading_metrics.html).

### Custom metrics

Azimuth can also compute custom metrics, still based on the HuggingFace Metric API.
Please refer to [HuggingFace Metric Hub](https://github.com/huggingface/datasets/tree/master/metrics)
to find currently available metrics.

Metrics such as precision and recall can be defined as such:

```python
def _compute(
        self,
        predictions: List[int],
        references: List[int],
        probabilities: np.ndarray,
    ) -> Dict[str, Any]:
    """Compute the outcome for each item.

     Args:
         predictions: Predicted labels.
         references: Ground truth labels.
         probabilities: Probabilities computed by the pipeline.

     Returns:
          A dictionary with the computed values.
    """
    ...
```

## Examples

### Other metrics

TODO

--8<-- "includes/abbreviations.md"
