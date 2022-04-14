# Behavioral Testing

## What is it?

Performing behavioral testing on ML models was first introduced in the **checklist** paper
([Ribeiro, Marco Tulio, et al., 2020](https://arxiv.org/abs/2005.04118)[^1]). Behavioral tests
provide an assessment of the model **robustness to small modifications to the input**. Proper
behavioral testing can help in detecting bias or other potential harmful features which may not be
otherwise obvious.

## Where is this used in Azimuth?

In Azimuth, behavioral tests are automatically executed when launching the tool, using the provided
dataset and model.

* In the [Utterance Details](../user-guide/exploration-space/utterance-details), the details of all
  the tests that were computed for a given utterance are shown.
* A summary of each test for all utterances in both sets (training and evaluation) is available in
  the
  [Behavioral Testing Summary](../user-guide/behavioral-testing-summary.md).
* Finally, a [Smart Tag](smart-tags.md) is generated for each utterance where at least one test of
  each family fails.

## How is it computed?

The tests are **deterministic** for reproducibility purposes.

### Test Failing Criteria

The tests can fail for two reasons.

* The test will fail if the **predicted class** for the modified utterance is **different** from the
  predicted class of the original utterance.

??? example

    | Original Utterance       | Predicted Class      |
    |--------------------------|----------------------|
    | Azimuth is the best tool | `positive` |

    | Modified Utterance         | Predicted Class   | Test fails? |
    |--------------------------|----------------------|-----------|
    | Hello Azimuth is the best tool  | `positive` | NO   |
    | Azimuth is the best tool!!! | `negative` | YES   |

* The test will fail if the **confidence** associated with the predicted class of the modified
  utterance is **too far** (based on a threshold) from the confidence of the original utterance. By
  default, the threshold is set to 1, meaning the tests will never fail due to a change in
  confidence for the same predicted class.

??? example

    Examples with a threshold set at 0.1.

    | Original Utterance       | Predicted Class      | Confidence |
    |--------------------------|----------------------|------------|
    | Azimuth is the best tool | `positive` | 95% |

    | Modified Utterance         | Predicted Class           | Confidence | Test fails? |
    |--------------------------|----------------------|-----------|-----------|
    | Hello Azimuth is the best tool  | `positive` | 82% | YES   |
    | Azimuth is the best TOOL | `positive` | 82% |NO   |

### Available Tests

All tests are _invariant_ (the modification should not change the predicted class) and assess the _
robustness_ of the model.

* The tool currently has 2 families of tests: `Fuzzy Matching` and `Punctuation`.
* For each test, different modification types can be applied (`Insertion`, `Deletion`, etc.)
    * For certain tests, all _modification types_ are applied to each utterance (e.g., `Typos` and
      `Neutral Token`).
    * For others, only one _modification type_ is applied based on the presence of a certain pattern
      in the utterance (e.g., `Punctuation` and `Contractions` tests).

#### Fuzzy Matching

* `Typos`: For this test, we simulate common typos that might happen when typing an utterance. By
  default, the test creates one typo per utterance. The different types of simulated typos (_
  modification types_) are:
    * `Swap`: Random swap of two adjacent characters in a word.
    * `Deletion`: Deletion of random characters in a word.
    * `Replacement`: Keyboard proximity-based typos inserted in a word.

* `Neutral Token`: Default neutral tokens are added to the utterance.
    * `PreInsertion`: One of ["pls", "please", "hello", "greetings"] is added at the beginning of
      the utterance.
    * `PostInsertion`: One of ["pls", "please", "thank you", "appreciated"] is added at the end of
      an utterance.

* `Contractions`: This test is applied only when the utterance contains a relevant expression that
  can be contracted or expanded. The list is taken from
  [NL-Augmenter](https://github.com/GEM-benchmark/NL-Augmenter/blob/main/transformations/contraction_expansions/transformation.py)
  .
    * `Contraction`: Contract relevant expressions, if present.
    * `Expansion`: Expand relevant expressions, if present.

#### Punctuation
* `Question Mark`: Adds/Deletes/Replaces question marks.
    * `Deletion`: Removes the ending question mark, if present.
    * `Replacement`: Replaces the ending punctuation sign ('.', '!', ','), if present, by a
    question mark.
    * `PostInsertion`: Adds an ending question mark when the utterance does not end with a punctuation sign.

* `Ending period`: Same logic as the `Question Mark` test, with a period.
    * `Deletion`: Removes the ending period, if present.
    * `Replacement`: Replaces the ending punctuation sign ('?', '!', ','), if present, by a period.
    * `PostInsertion`: Adds an ending period when the utterance does not end with a punctuation
      sign.

* `Inner Comma`: Adds/Deletes comma inside the utterance (not at the end).
    * `Deletion`: Removes all commas inside the utterance, if present.
    * `Insertion`: Adds a comma near the middle of the utterance.

* `Inner Period`: Same logic as the `Inner Comma` test, with a period.
    * `Deletion`: Removes all periods inside the utterance, if present.
    * `Insertion`: Adds a period near the middle of the utterance.

### Configuration

[Behavioral Testing Configuration](../reference/configuration/analyses/behavioral_testing.md)
details how to change some parameters, such as the lists of neutral tokens, the number of typos and
the threshold confidence delta above which the tests should fail.

[^1]: Ribeiro, Marco Tulio, et al. "Beyond accuracy: Behavioral testing of NLP models with
CheckList." Association for Computational Linguistics (ACL), 2020.

--8<-- "includes/abbreviations.md"
