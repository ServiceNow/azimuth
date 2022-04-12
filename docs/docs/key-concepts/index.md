# Key Concepts

Azimuth leverages different analyses and concepts to enhance the process of **dataset analysis and
error analysis**. The notion of **smart tags** is the most important concept that unifies the
others.

## Smart Tags

Smart tags are assigned to utterances by Azimuth when the app is launched. They can be seen as
**meta-data on the utterance and/or its prediction**. It aims at **guiding the error analysis**
process, identifying interesting data samples which may require
**further action and investigation**. Different families of smart tags exist, based on the different
types of analyses that Azimuth provides.

!!! example

    Examples of smart tag **families**:

    * **syntax** tags: identifies utterances with an abnormal syntax.
    * **behavioral testing** tags: identifies utterances which failed at least one behavioral test.

    Examples of **specific** smart tags:

    * `long_sentences` identifies utterances with more than 15 tokens.
    * `failed_punctuation` identifies utterances that failed at least one punctuation test.

The full list of smart tags is available in [:material-link: Smart Tags](smart-tags.md).

## Proposed Actions

While smart tags are computed automatically and cannot be changed, proposed actions are annotations
that can be added by the user to identify a proposed action that should be done on a specific data
sample.

!!! example

    Examples of **proposed actions**:

    * `relabel` to identify data samples which label should be changed.
    * `remove` to identify data samples that should be removed from the dataset.

A dedicated page on [:material-link: Proposed Actions](proposed-actions.md) gives the full list of
available actions.

## Prediction Outcomes

Another key concept used through the application is the notion of prediction outcomes. It acts as a
**metric of success** for a given utterance prediction. More details are available
in [:material-link: Prediction outcomes](outcomes.md).

* :material-circle:{ .correct_predicted } **Correct & Predicted**
* :material-circle:{ .correct_rejected } **Correct & Rejected**
* :material-circle:{ .incorrect_rejected } **Incorrect & Rejected**
* :material-circle:{ .incorrect_predicted } **Incorrect & Predicted**

## Analyses

In Azimuth different types of analysis are provided. There is a dedicated section for each in the documentation. Almost all of them (except saliency maps) are
linked to smart tags.

1. [:material-link: Syntax Analysis](syntax-analysis.md)
2. [:material-link: Similarity Analysis](similarity.md)
3. [:material-link: Behavioral Testing](behavioral-testing.md)
4. [:material-link: Almost Correct](outcomes.md)
5. [:material-link: Uncertainty Quantification](uncertainty.md)
6. [:material-link: Saliency Maps](saliency.md)

## Proposed Workflow

TODO STILL IN PROGRESS

While going through the dataset and the model predictions in Azimuth, you may encounter issues in
your dataset that would need fixing. These issues can be in both the evaluation set or the training
set.

Some samples might be simply noisy, either the utterance itself or the label. In that case, you can
identify the **relabel** action or **remove** action. After exporting the annotations, you can send
the list of utterances to relabel to your data labeler. You may remove the noisy data samples
yourself.

Some other utterances might seem like they belong to a new class that is not currently part of the
list of classes. It might not be clear at first if the new class is worth adding, so as you explore
the dataset, you can add annotate the utterances with **consider new class**. When done going
through the dataset, you can filter all utterances with that proposed action, and see if there is a
clear pattern emerging, that would justify adding the new class to the dataset.
