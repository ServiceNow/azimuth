# Dataset Warnings

Some thresholds can be set to modify the number of warnings on the
[Dataset Warnings page](../../user-guide/dataset-warnings.md). The default values are shown below.

```python
class DatasetWarningsOptions(BaseModel):
    min_num_per_class: int = 20
    max_delta_representation: float = 0.05
    max_delta_mean_tokens: float = 3.0
    max_delta_std_tokens: float = 3.0
```
