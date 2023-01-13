# Syntax Analysis Config

🔵 **Default value:** `SyntaxOptions()`

In the Syntax config, users can modify thresholds to determine what is considered a short
or a long sentence, as well as select the spaCy model and the dependency tags used for certain
syntax-related smart tags. More details are explained in
[:material-link: Syntax Analysis](../../../key-concepts/syntax-analysis.md).

Note that language-related defaults are dynamically selected based on the language specified in the
[:material-link: Language Config](../language.md) (default is English). As such, the spaCy model and
dependency tag lists will generally not need to be modified.

=== "Class Definition"

    ```python
    from pydantic import BaseModel

    class SyntaxOptions(BaseModel):
        short_sentence_max_word int = 3 # (1)
        long_sentence_min_word: int = 12 # (2)
        spacy_model: SupportedSpacyModels = SupportedSpacyModels.use_default  # Language-based default (3)
        subj_tags: List[str] = []  # Language-based default value (4)
        obj_tags: List[str] = []  # Language-based default value (5)
    ```

    1. Maximum number of tokens for a sentence to be tagged as short (e.g <=3 for the default)
    2. Minimum number of tokens for a sentence to be tagged as long (e.g >=16 for the default)
    3. spaCy model to use for syntax tagging.
    4. spaCy dependency tags used to determine whether a word is a subject (noun).
    5. spaCy dependency tags used to determine whether a word is an object (noun).

=== "Config Example"

    ```json
    {
      "syntax": {
        "short_sentence_max_word": 5
      }
    }
    ```

=== "English defaults"

    ```python
    import spacy

    # Part of Speech
    subj_tags = ["nsubj", "nsubjpass"]
    obj_tags = ["dobj", "pobj", "dobj"]
    spacy_model = spacy.load("en_core_web_sm")
    ```

=== "French defaults"

    ```python
    import spacy

    # Part of Speech
    subj_tags = ["nsubj", "nsubj:pass"]
    obj_tags = ["obj", "iobj", "obl:arg", "obl:agent", "obl:mod"]
    spacy_model = spacy.load("fr_core_news_md")
    ```

--8<-- "includes/abbreviations.md"
