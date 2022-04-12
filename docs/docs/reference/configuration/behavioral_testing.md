# Behavioral Testing

[:material-link: Behavioral Testing](../../key-concepts/behavioral-testing.md) in the Key Concepts
section explains how the different configuration attributes will affect the tests results.

If your machine does not have a lot of computing power, `behavioral_testing` can be set to `null`.
It can be enabled later on in the application.

=== "Available Attributes"

    ```python
    class BehavioralTestingOptions(BaseModel):
        neutral_token: NeutralTokenOptions = NeutralTokenOptions()
        punctuation: PunctuationTestOptions = PunctuationTestOptions()
        fuzzy_matching: FuzzyMatchingTestOptions = FuzzyMatchingTestOptions()
        typo: TypoTestOptions = TypoTestOptions()
        seed: int = 300

    class NeutralTokenOptions(BaseModel):
        threshold: float = 1  # (5)
        suffix_list: List[str] = ["pls", "please", "thank you", "appreciated"]
        prefix_list: List[str] = ["pls", "please", "hello", "greetings"]


    class PunctuationTestOptions(BaseModel):
        threshold: float = 1  # (4)


    class FuzzyMatchingTestOptions(BaseModel):
        threshold: float = 1  # (3)


    class TypoTestOptions(BaseModel):
        threshold: float = 1   # (2)
        nb_typos_per_utterance: int = 1 # (1)
    ```

    1. Ex: if `nb_typos_per_utterance` = 2, this will create 2 tests per utterance, one with 1 typo and
    another with 2 typos.
    2. Threshold that defines the confidence gap above which the test will fail.
    3. Threshold that defines the confidence gap above which the test will fail.
    4. Threshold that defines the confidence gap above which the test will fail.
    5. Threshold that defines the confidence gap above which the test will fail.

=== "Modifying Values in the Config"

    For example, if the user wants to change the threshold for the punctuation test:

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
    {"behavioral_testing": null}
    ```
