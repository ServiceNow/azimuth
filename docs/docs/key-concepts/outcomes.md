# Prediction Outcomes

Based on the predicted class and the label, Azimuth provides some assessment of the "correctness" of
a given prediction, named _Outcomes_. This concept is used across the application both as an overall
metric, but also as an individual metric of success for any given utterance. These outcomes align
with some business outcomes: not all errors are equal.

## Rejection Class

Most ML problems have the notion of a rejection class, sometimes called the abstention class. This
is the class that means the '**absence of predictions**'. In some use cases, the model can predict
it directly as one of its classes, and in other scenarios, it is only predicted when the **
confidence of a model is below a given threshold**. In Azimuth, the rejection class needs to be
defined in the config, as explained in
the [:material-link: Project Configuration](../reference/configuration/project.md).

From a business outcome, it is usually less costly to not predict anything than to predict the wrong
class. This is why the notion of rejection is present in the outcomes, as explained below.

## Outcomes

Azimuth defines 4 different outcomes:

* :material-circle:{ .correct_predicted } **Correct & Predicted**
    * When the label matches the predicted class, and is not the rejection class.
    * These are the predictions that add the **most value**.
* :material-circle:{ .correct_rejected } **Correct & Rejected**
    * When the label matches the predicted class, but is the rejection class.
    * These predictions are correct, but do **not necessarily bring a lot of value**, given that
      nothing from the interesting classes was predicted.
* :material-circle:{ .incorrect_rejected } **Incorrect & Rejected**
    * When the predicted class is the rejection class, and the label is not.
    * These predicted are incorrect, but **not as costly** as when the wrong class is predicted.
* :material-circle:{ .incorrect_predicted } **Incorrect & Predicted**
    * When the label does not match the predicted class, and is not the rejection class.
    * These predicted are incorrect and are the **most costly**.

The colors of the outcomes are used throughout the application to show how many utterances of each
of the outcomes are present in different aggregations.
