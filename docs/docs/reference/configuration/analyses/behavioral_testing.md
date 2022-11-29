# Behavioral Testing Config

:blue_circle: **Default value:** `BehavioralTestingOptions()`

**Environment Variable**: `BEHAVIORAL_TESTING`

[:material-link: Behavioral Testing](../../../key-concepts/behavioral-testing.md) in the Key
Concepts section explains how the different configuration attributes will affect the tests results.
Note that language-related defaults are dynamically selected based on the language specified in the
[:material-link: Language Config](../language.md) (default is English).

If your machine does not have a lot of computing power, `behavioral_testing` can be set to `null`.
It can be enabled later on in the application.

=== "Class Definition"

    ```python
    from typing import List

    from pydantic import BaseModel


    class NeutralTokenOptions(BaseModel):
        threshold: float = 1  # (5)
        suffix_list: List[str] = []  # Language-based default value # (6)
        prefix_list: List[str] = []  # Language-based default value # (7)


    class PunctuationTestOptions(BaseModel):
        threshold: float = 1  # (4)


    class FuzzyMatchingTestOptions(BaseModel):
        threshold: float = 1  # (3)


    class TypoTestOptions(BaseModel):
        threshold: float = 1  # (2)
        nb_typos_per_utterance: int = 1  # (1)


    class BehavioralTestingOptions(BaseModel):
        neutral_token: NeutralTokenOptions = NeutralTokenOptions()
        punctuation: PunctuationTestOptions = PunctuationTestOptions()
        fuzzy_matching: FuzzyMatchingTestOptions = FuzzyMatchingTestOptions()
        typo: TypoTestOptions = TypoTestOptions()
        seed: int = 300
    ```

    1. Ex: if `nb_typos_per_utterance` = 2, this will create 2 tests per utterance, one with 1 typo and
    another with 2 typos.
    2. Threshold that defines the confidence gap above which the test will fail.
    3. Threshold that defines the confidence gap above which the test will fail.
    4. Threshold that defines the confidence gap above which the test will fail.
    5. Threshold that defines the confidence gap above which the test will fail.
    6. Strings appended to end of utterances for neutral token tests.
    7. Strings prepended to beginning of utterances for neutral token tests.

=== "Config Example"

    For example, to change the threshold for the punctuation test:

    ```json
    {
      "behavioral_testing": {
        "punctuation": {
          "threshold": 0.1
        }
      }
    }
    ```

=== "Disabling Behavioral Testing"

    ```json
    {
      "behavioral_testing": null
    }
    ```

=== "English defaults"

    ```python
    # Neutral tokens
    suffix_list = ["pls", "please", "thank you", "appreciated"]
    prefix_list = ["pls", "please", "hello", "greetings"]
    ```

=== "French defaults"

    ```python
    # Neutral tokens
    suffix_list = ["svp", "s'il vous plaît", "merci", "super"]
    prefix_list = ["svp", "s'il vous plaît", "bonjour", "allô"]
    ```

--8<-- "includes/abbreviations.md"
