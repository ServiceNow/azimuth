# Syntax Analysis Config

:blue_circle: **Default value:** `SyntaxOptions()`

Some thresholds can be modified to determine what is considered a short and a long sentence, as explained in
[:material-link: Syntax Analysis](../../../key-concepts/syntax-analysis.md).

=== "Class Definition"

    ```python
    from pydantic import BaseModel

    class SyntaxOptions(BaseModel):
        short_sentence_max_token: int = 3 # (1)
        long_sentence_min_token: int = 16 # (2)
    ```

    1. Maximum number of tokens for a sentence to be tagged as short (e.g <=3 for the default)
    2. Minimum number of tokens for a sentence to be tagged as long (e.g >=16 for the default)

=== "Config Example"

    ```json
    {
      "syntax": {
        "short_sentence_max_token": 5
      }
    }
    ```

--8<-- "includes/abbreviations.md"
