# Smart Tags

When Azimuth is launched, smart tags are computed automatically (or loaded from the cache)
on all utterances, on both training and evaluation sets.

Conceptually, smart tags are
**meta-data on the utterance and/or its prediction**. They help to narrow down data samples to
identify those that may require **further action and investigation**. Different families of smart
tags exist, based on the different types of analyses that Azimuth provides.

The current list of supported smart tag, and their families, is detailed below.

## Extreme Length <svg width="35" height="35" viewBox="0 0 24 24" style="vertical-align: bottom;"><path d="M12,2 A10,10 0,0,0 12,22 A10,10 0,0,0 12,2 Z M8,12 L4.512,9.184 A8,8 0,0,1 19.488,9.184 L16,12 L19.488,14.816 A8,8 0,0,1 4.512,14.816 Z M8,7 H16 V9 H13 V17 H11 V9 H8 V7 Z" fill="currentColor"/></svg>

[:material-link: Syntax Analysis](syntax-analysis.md) gives more details on how the syntactic
information is computed.

* `multiple_sentences`: The number of sentences is above 1. All other syntactic smart tags will be
  disabled when this is the case.
* `long_sentence`: The number of tokens is above 15.
* `short_sentence`: The number of tokens is less than or equal to 3.

## Partial Syntax <svg width="35" height="35" viewBox="0 0 24 24" style="vertical-align: bottom;"><path d="M12,22 A10,10 0,0,0 12,2 V4 A8,8 0,0,1 12,20 Z M6.593591825444028,20.412535328311815 A10,10 0,0,0 9.182674431585703,21.594929736144973 L9.746139545268562,19.67594378891598 A8,8 0,0,1 7.674873460355222,18.73002826264945 Z M2.9036800464548183,16.154150130018866 A10,10 0,0,0 4.442504256457418,18.54860733945285 L5.954003405165935,17.23888587156228 A8,8 0,0,1 4.722944037163854,15.323320104015094 Z M2.101785581190672,10.57685161726715 A10,10 0,0,0 2.101785581190674,13.423148382732851 L4.0814284649525385,13.138518706186282 A8,8 0,0,1 4.081428464952538,10.861481293813721 Z M4.442504256457417,5.45139266054715 A10,10 0,0,0 2.9036800464548165,7.845849869981135 L4.722944037163853,8.676679895984908 A8,8 0,0,1 5.954003405165933,6.76111412843772 Z M9.182674431585703,2.405070263855027 A10,10 0,0,0 6.593591825444026,3.5874646716881866 L7.6748734603552204,5.2699717373505495 A8,8 0,0,1 9.746139545268562,4.324056211084021 Z M8,7 H16 V9 H13 V17 H11 V9 H8 V7 Z" fill="currentColor"/></svg>

[:material-link: Syntax Analysis](syntax-analysis.md) gives more details on how the syntactic
information is computed.

* `missing_subj`: The sentence is missing a subject.
* `missing_verb`: The sentence is missing a verb.
* `missing_obj`: The sentence is missing an object.

## Dissimilar <svg width="35" height="35" viewBox="0 0 24 24" style="vertical-align: bottom;"><path d="M12,2 A10,10 0,0,0 12,22 A10,10 0,0,0 12,2 Z M12,4 A8,8 0,0,1 12,20 Z" fill="currentColor"/></svg>

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

## Almost Correct <svg width="35" height="35" viewBox="0 0 24 24" style="vertical-align: bottom;"><path d="M12,22 A10,10 0,0,0 12,2 V4 A8,8 0,0,1 12,20 Z M6.593591825444028,20.412535328311815 A10,10 0,0,0 9.182674431585703,21.594929736144973 L9.746139545268562,19.67594378891598 A8,8 0,0,1 7.674873460355222,18.73002826264945 Z M2.9036800464548183,16.154150130018866 A10,10 0,0,0 4.442504256457418,18.54860733945285 L5.954003405165935,17.23888587156228 A8,8 0,0,1 4.722944037163854,15.323320104015094 Z M2.101785581190672,10.57685161726715 A10,10 0,0,0 2.101785581190674,13.423148382732851 L4.0814284649525385,13.138518706186282 A8,8 0,0,1 4.081428464952538,10.861481293813721 Z M4.442504256457417,5.45139266054715 A10,10 0,0,0 2.9036800464548165,7.845849869981135 L4.722944037163853,8.676679895984908 A8,8 0,0,1 5.954003405165933,6.76111412843772 Z M9.182674431585703,2.405070263855027 A10,10 0,0,0 6.593591825444026,3.5874646716881866 L7.6748734603552204,5.2699717373505495 A8,8 0,0,1 9.746139545268562,4.324056211084021 Z M18,9.19194 L11.1598,17 L6,12.5826 L7.23266,11.2042 L10.9693,14.4032 L16.5787,8 L18,9.19194 Z" fill="currentColor"/></svg>

These smart tags do not come from a particular analysis. They are computed based on the predictions
and the labels.

* `correct_top_3`: The top 1 prediction is not the right one, but the right one is in the top 3.
* `correct_low_conf`: The top 1 prediction was the right one, but its confidence is below the
  threshold, and thus the rejection class was predicted.

## Behavioral Testing <svg width="35" height="35" viewBox="0 0 24 24" style="vertical-align: bottom;"><path d="M12,2 A10,10 0,0,0 12,22 A10,10 0,0,0 12,2 Z M12,4 A8,8 0,0,1 12,20 Z M19.035533905932738,12 L14.914213562373096,7.585786437626905 L13.5,9 L15.5,11 H7 V13 H15.5 L13.5,15 L14.914213562373096,16.414213562373096 Z" fill="currentColor" fill-rule="evenodd"/></svg>

[:material-link: Behavioral Testing](behavioral-testing.md) lists all the tests that are executed.

* `failed_fuzzy_matching`: At least one fuzzy matching test failed.
* `failed_punctuation`: At least one punctuation test failed.


## Pipeline Comparison <svg width="35" height="35" viewBox="0 0 24 24" style="vertical-align: bottom;"><path d="M12,3 A9,9 0,0,0 12,21 A9,9 0,0,0 12,3 Z M16,16 H9.690598923241497 L7.381197846482994,12 H3 H7.381197846482994 L9.690598923241497,8 H16" fill="none" stroke="currentColor" stroke-width="2"/></svg>

Smart tags that are computed based on the difference between pipelines predictions.

* `incorrect_for_all_pipelines`: When all pipelines give the wrong prediction.
* `pipeline_disagreement`: When at least one of the pipelines disagrees with the others.

## Uncertain <svg width="35" height="35" viewBox="0 0 24 24" style="vertical-align: bottom;"><path d="M12,22 A10,10 0,0,0 12,2 V4 A8,8 0,0,1 12,20 Z M6.593591825444028,20.412535328311815 A10,10 0,0,0 9.182674431585703,21.594929736144973 L9.746139545268562,19.67594378891598 A8,8 0,0,1 7.674873460355222,18.73002826264945 Z M2.9036800464548183,16.154150130018866 A10,10 0,0,0 4.442504256457418,18.54860733945285 L5.954003405165935,17.23888587156228 A8,8 0,0,1 4.722944037163854,15.323320104015094 Z M2.101785581190672,10.57685161726715 A10,10 0,0,0 2.101785581190674,13.423148382732851 L4.0814284649525385,13.138518706186282 A8,8 0,0,1 4.081428464952538,10.861481293813721 Z M4.442504256457417,5.45139266054715 A10,10 0,0,0 2.9036800464548165,7.845849869981135 L4.722944037163853,8.676679895984908 A8,8 0,0,1 5.954003405165933,6.76111412843772 Z M9.182674431585703,2.405070263855027 A10,10 0,0,0 6.593591825444026,3.5874646716881866 L7.6748734603552204,5.2699717373505495 A8,8 0,0,1 9.746139545268562,4.324056211084021 Z M10.7946,15 H12.6429 V14.4548 C12.6429,13.5343 12.9732,13.0606 14.125,12.3813 C15.3036,11.6753 16,10.7011 16,9.32473 V9.30685 C16,7.40318 14.4107,6 12.0536,6 C9.46429,6 8.08036,7.53724 8,9.5571 V9.57498 L9.83929,9.56604 H9.85714 C9.92857,8.3863 10.7232,7.64449 11.9554,7.64449 C13.1786,7.64449 13.9732,8.3863 13.9732,9.38729 V9.40516 C13.9732,10.3168 13.5893,10.8352 12.5089,11.4876 C11.2857,12.2205 10.7411,13.0248 10.7857,14.285 L10.7946,15 Z M10.8242,16.1328 V18.0026 H12.694 V16.1328 H10.8242 Z" fill="currentColor"/></svg>

[:material-link: Uncertainty Quantification](uncertainty.md) provides more details on how the
uncertainty is estimated.

* `high_epistemic_uncertainty`: If an uncertainty config was defined, this tag will highlight
  predictions with high epistemic uncertainty.
