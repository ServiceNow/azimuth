# Syntax Analysis Config

:blue_circle: **Default value:** `SyntaxOptions()`

In the Syntax config, users can modify thresholds to determine what is considered a short
or a long sentence, as well as select the spaCy model and the dependency tags used for
syntax-related smart tags. More details are explained in
[:material-link: Syntax Analysis](../../../key-concepts/syntax-analysis.md).

Note that language-related defaults are dynamically selected based on the language specified in the
[:material-link: Project Config](./project.md) (default is English). As such, the spaCy model and
dependency tag lists will generally not need to be modified.

=== "Class Definition"

    ```python
    from pydantic import BaseModel

    class SyntaxOptions(BaseModel):
        short_sentence_max_token: int = 3 # (1)
        long_sentence_min_token: int = 16 # (2)
        spacy_model: SupportedSpacyModels = SupportedSpacyModels.use_default  # Language-based default (3)
        subj_tags: List[str] = []  # Language-based default value (4)
        obj_tags: List[str] = []  # Language-based default value (5)
    ```

    1. Maximum number of tokens for a sentence to be tagged as short (e.g <=3 for the default)
    2. Minimum number of tokens for a sentence to be tagged as long (e.g >=16 for the default)
    3. spaCy model to use for syntax tagging. English default is `"en_core_web_sm"`.
    4. spaCy dependency tags used to determine whether a word is a subject (noun). English
    default is `["nsubj", "nsubjpass"]`.
    5. spaCy dependency tags used to determine whether a word is an object (noun). English
    default is `["dobj", "pobj", "obj"]`.

=== "Config Example"

    ```json
    {
      "syntax": {
        "short_sentence_max_token": 5
      }
    }
    ```

--8<-- "includes/abbreviations.md"
