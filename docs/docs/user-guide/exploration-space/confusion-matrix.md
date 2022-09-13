# Confusion Matrix

The confusion matrix displays the **model confusion between each pair of intents**. The confusion is
defined as the number of utterances with a given label that are predicted as another label.

## Normalization
The toggle "Normalize" in the top right corner allows alternating between normalized and raw values.
When normalized, the number of utterances is divided by to the total number of utterances
with the given label.

## Class Ordering
The default order for the rows and columns is determined based on the reverse Cuthill-Mckee algorithm, which will group as many classes as possible with similar confusion. The algorithm ignores all confusion values under 10%. The rejection class is also ignored and is always the last one in the order.

The toggle "Preserve user-provided class order" allows showing the confusion matrix according to the class order provided by the user.

!!! tip "Outcome colors"

    The prediction [outcome](../../key-concepts/outcomes.md) colors are shown on the confusion
    matrix.

![Screenshot](../../_static/images/exploration-space/confusion-matrix.png)

!!! example

    In this example, 55% of utterances labeled as `bill_due` were predicted as `bill_balance`.
