# Confusion Matrix

The confusion matrix displays the **model confusion between each pair of intents**.
The confusion is defined as the number of utterances with a given label that are predicted as another label.
The prediction [outcome](../../key-concepts/outcomes.md) colors are shown on the confusion matrix.

![Screenshot](../../_static/images/exploration-space/confusion-matrix.png)

## Normalization
The toggle "Normalize" in the top right corner allows alternating between normalized and raw values.
When normalized, the number of utterances is divided by to the total number of utterances
with the given label.

!!! example

    In this example, 45% of utterances labeled as `bill_due` were predicted as `bill_balance`.

## Class Ordering
The default order for the rows and columns is determined based on the reverse Cuthill-Mckee algorithm, which will group as many classes as possible with similar confusion. The algorithm ignores all confusion values under 10%. The rejection class is also ignored and is always the last one in the order.

Toggling off  "Reorder classes" disables the reordering and allows showing the confusion matrix according to the class order provided by the user.

## Interaction
Users can click on any confusion matrix cell, row, or column to filter the data accordingly.
For example, clicking on a row label will filter the data on that specific label.
