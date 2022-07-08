# Key Concepts

Azimuth leverages different analyses and concepts to enhance the process of **dataset analysis and
error analysis**.

The notion of **smart tags** is the most important concept, as it unifies most of the other
analyses.

## Smart Tags

Smart tags are assigned to utterances by Azimuth when the app is launched. They can be seen as
**meta-data on the utterance and/or its prediction**. The goal is to **guide the error analysis
process**, identifying interesting
data samples which may require
**further action and investigation**. Different families of smart tags exist, based on the different
types of analyses that Azimuth provides.

!!! example "Smart tag examples"

    Examples of smart tag **families**:

    * **partial syntax**: identifies utterances with a partial syntax, e.g. missing a verb.
    * **behavioral testing**: identifies utterances which failed at least one behavioral test.

    Examples of **individual** smart tags:

    * `long_sentences` identifies utterances with more than 15 tokens.
    * `failed_punctuation` identifies utterances that failed at least one punctuation test.

The full list of smart tags is available in [:material-link: Smart Tags](smart-tags.md).

## Proposed Actions

While smart tags are computed automatically and cannot be changed, proposed actions are annotations
that can be added by the user to identify a proposed action that should be done on a specific data
sample.

!!! example "Proposed action examples"

    * `relabel` to identify data samples whose labels should be changed.
    * `remove` to identify data samples that should be removed from the dataset.

A dedicated page on [:material-link: Proposed Actions](proposed-actions.md) gives the full list of
available actions.

## Prediction Outcomes

Another key concept used through the application is the notion of prediction outcomes. It acts as a
**metric of success** for a given prediction. More details are available
in [:material-link: Prediction outcomes](outcomes.md).

* :material-circle:{ .correct_predicted } **Correct & Predicted**
* :material-circle:{ .correct_rejected } **Correct & Rejected**
* :material-circle:{ .incorrect_rejected } **Incorrect & Rejected**
* :material-circle:{ .incorrect_predicted } **Incorrect & Predicted**

## Analyses

In Azimuth, different types of analysis are provided. Each analysis has a dedicated section in the
documentation. Almost all of them (except saliency maps) are linked to smart tags.

1. [:material-link: Saliency Maps](saliency.md)
2. [:material-link: Syntax Analysis](syntax-analysis.md)
3. [:material-link: Similarity Analysis](similarity.md)
4. [:material-link: Behavioral Testing](behavioral-testing.md)
5. [:material-link: Uncertainty Estimation](uncertainty.md)
