# Dataset Class Distribution Analysis

A **discrepancy** between the training and evaluation sets can cause problems with a model. For
example, the model may **not have a representative sample** of examples to train on, making it **
hard to generalize**
in production.

Alternatively, you might be measuring the performance of the model on an evaluation set that may **
not be a good indicator of the performance in production**. Distribution analysis aims to give
warnings when the training and evaluation sets look too different in some aspect of the data.

![](../_static/images/dataset-class-distribution-analysis/dataset-warnings-1.png)
![](../_static/images/dataset-class-distribution-analysis/dataset-warnings-2.png)
![](../_static/images/dataset-class-distribution-analysis/dataset-warnings-3.png)

## General Warnings

Azimuth performs 2 analyses to assess class size in the training vs evaluation sets.

### Missing samples

In this first analysis, the application flags when a class has **fewer than `X`** (default is 20)
samples in either the training or the evaluation set. The plot helps to visualize the values for
each class.

### Representation mismatch

The second analysis flags if a class is **over-represented** in the evaluation set (relative to
other classes) or the training set. If the delta between the percentage of a class in each set is
above `Y`% (default is 5%), the analysis flags it.

## Syntactic Warnings

Syntactic warnings indicate differences in the syntax of the utterances between each set.

### Length mismatch

Length mismatch compares the number of **tokens per utterance** in both sets. The application flags
a warning if the mean and/or standard deviation between the 2 distributions is above `Z `and `W` (
default is 3 for both) respectively.

## Configuration

All thresholds mentioned (`X`/`Y`/`Z`/`W`) can be modified in the config file, as explained
in [:material-link: Dataset Warnings Configuration](../reference/configuration/dataset_warnings.md).
