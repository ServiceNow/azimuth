# Dataset Class Distribution Analysis Config

:blue_circle: **Default value:** `DatasetWarningsOptions()`

Some thresholds can be set to modify the number of warnings in the
[:material-link: Dataset Class Distribution Analysis](../../../user-guide/dataset-warnings.md).

=== "Class Definition"

    ```python
    from pydantic import BaseModel

    class DatasetWarningsOptions(BaseModel):
        min_num_per_class: int = 20 # (1)
        max_delta_representation: float = 0.05 # (2)
        max_delta_mean_tokens: float = 3.0 # (3)
        max_delta_std_tokens: float = 3.0 # (4)
    ```

    1. Threshold for the first set of warnings (missing samples).
    2. Threshold for the second set of warnings (representation mismatch).
    3. Threshold for the third set of warnings (length mismatch).
    4. Threshold for the third set of warnings (length mismatch).

=== "Config Example"

    ```json
    {
      "dataset_warnings": {
        "min_num_per_class": 40
      }
    }
    ```

--8<-- "includes/abbreviations.md"
