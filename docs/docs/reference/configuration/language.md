# Language Config

The language configuration specifies the language of the dataset and model, for the purpose of
determining default values used for
[:material-link: Syntax Analysis](../../key-concepts/syntax-analysis.md),
[:material-link: Similarity Analysis](../../key-concepts/similarity.md), and
[:material-link: Behavioral Testing](../../key-concepts/behavioral-testing.md).

For language-specific defaults, see
[:material-link: Syntax Analysis Config](analyses/syntax.md),
[:material-link: Similarity Analysis Config](analyses/similarity.md), and
[:material-link: Behavioral Testing Config](analyses/behavioral_testing.md).

## Config Scopes

=== "Class Definition"

    ```python
    from enum import Enum

    class SupportedLanguage(str, Enum):
        en = "en"
        fr = "fr"

    class LanguageConfig:
        language: SupportedLanguage = SupportedLanguage.en
    ```

--8<-- "includes/abbreviations.md"
