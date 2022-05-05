# Smart Tags

When Azimuth is launched, smart tags are computed automatically (or loaded from the cache)
on all utterances, on both training and evaluation sets.

Conceptually, smart tags are
**meta-data on the utterance and/or its prediction**. They help to narrow down data samples to
identify those that may require **further action and investigation**. Different families of smart
tags exist, based on the different types of analyses that Azimuth provides.

The current list of supported smart tags is detailed below.

## Syntactic Information

[:material-link: Syntax Analysis](syntax-analysis.md) gives more details on how the syntactic
information is computed.

* `multiple_sentences`: The number of sentences is above 1. All other syntactic smart tags will be
  disabled when this is the case.
* `long_sentence`: The number of tokens is above 15.
* `short_sentence`: The number of tokens is less than or equal to 3.
* `missing_subj`: The sentence is missing a subject.
* `missing_verb`: The sentence is missing a verb.
* `missing_obj`: The sentence is missing an object.

## Potential Outliers Detection

[:material-link: Similarity Analysis](similarity.md) provides more information on how similarity is
computed.

* `conflicting_neighbors_train`: The utterance has very few (or no) neighbors from the same class
  in the training set.
* `conflicting_neighbors_eval`: The utterance has very few (or no) neighbors from the same class in
  the evaluation set.
* `no_close_train`: The closest utterance in the training set has a cosine similarity below a
  threshold (default = 0.5).
* `no_close_eval`: The closest utterance in the evaluation set has a cosine similarity below a
  threshold (default = 0.5).

[:material-link: Uncertainty Quantification](uncertainty.md) provides more details on how the
uncertainty is estimated.

* `high_epistemic_uncertainty`: If an uncertainty config was defined, this tag will highlight
  predictions with high epistemic uncertainty.

## Behavioral Testing

[:material-link: Behavioral Testing](behavioral-testing.md) lists all the tests that are executed.

* `failed_fuzzy_matching`: At least one fuzzy matching test failed.
* `failed_punctuation`: At least one punctuation test failed.

## Almost Correct

These smart tags do not come from a particular analysis. They are computed based on the predictions
and the labels.

* `correct_top_3`: The top 1 prediction is not the right one, but the right one is in the top 3.
* `correct_low_conf`: The top 1 prediction was the right one, but its confidence is below the
  threshold, and thus the rejection class was predicted.

## Pipeline Comparison

Smart tags that are computed based on the difference between pipelines predictions.

* `incorrect_for_all_pipelines`: When all pipelines give the wrong prediction.
* `pipeline_disagreement`: When at least one of the pipelines disagrees with the others.