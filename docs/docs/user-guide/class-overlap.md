# Class Overlap

Class Overlap assesses the semantic overlap between pairs of classes. In some cases, high
overlap may be associated with poor class definitions, mislabelling, and/or model confusion.

**Class overlap** is determined with a dataset alone, based on the locations of utterances in
embedding space, as described in
[:material-link: Similarity Analysis](../key-concepts/similarity.md).

## Class Overlap Plot

The Class Overlap plot shows semantic overlap in the training data as flows between source and
target classes, displayed as nodes on the left (source) and right (target) sides of the plot.
Flows between class nodes
indicate the extent to which samples in a source class are in neighborhoods typified by
other classes (class overlap) or its own class (self overlap). Wider flows indicate greater
overlap values.

Nodes are ordered with flows for greatest overlap values at the top, so as to highlight these class
pairs.  The plot is interactive, in that nodes can be moved and reordered via dragging.

Plot options:

* **Overlap threshold**: The overlap threshold determines which flows will be displayed on the
  plot. Only flows with overlap values above this threshold will be plotted. The default value
  is set to the tenth highest overlap value, such that at least ten flows between different
  classes (i.e., not self overlap) will be displayed. Thus, the default value is for easy of
  visualization only, and will differ across different datasets.
* **Self overlap**: This toggle determines whether to show self overlap, which is the overlap
  (or similarity) of a class with itself.
* **Scale by class**: Class overlap values are normalized by source class, such that the sum of
  all overlaps for a source class (self and otherwise) is 1.  This toggle multiples overlap
  values by class sample sizes, changing node size and flow width accordingly.

These options allow for different aspects of exploration of class overlap.

By changing the overlap threshold, a user can focus on the class pairs with the greatest overlap
with less distraction, or choose to view all overlap from any given class to better understand
the complexity of the dataset.

By toggling self overlap, the user can get a sense of the relative magnitude of inter-class
overlap and any potential issue it may cause.

By toggling scaling by class size, a user can compare overlap between different pairs of classes to
understand the relative importance of the overlap to an individual class versus the relative
importance of the overlap across other classes in the dataset (intra-class vs. inter-class
comparison).

!!! tip

    :material-restart: Click the reset button next to the overlap threshold value to reset to
    the default threshold.

<figure markdown>
![](../_static/images/key-concepts/class-overlap-plot.png)
<figcaption>
Class Overlap plot on the Class Overlap page, accessed via the Dashboard.
</figcaption>
</figure>

