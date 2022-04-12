# Similarity Analysis

## What is it?

The core of the similarity analysis is to compute for each utterance in the dataset the **distance
to every other utterance**. Based on that, different analyses can be provided to determine how
similar utterances are within a class, across classes, and so on. This analysis can be quite
powerful given that **no trained ML model** is needed.

## Where is this used in Azimuth?

In Azimuth, the similarity analysis is used to derive smart tags, and also to show the most similar
utterances in both sets on
the [:material-link: Utterances Details](../user-guide/exploration-space/utterance-details.md).

<figure markdown>
  ![Image title](../_static/images/exploration-space/utterance-details-similarity.png)
  <figcaption>Similar utterances in the Utterance Details.</figcaption>
</figure>

## How is it Computed?

### Similarity Computation

To find the most similar utterances, the tool uses a **sentence embedding** (`all-MiniLM-L12-v2`
from [sentence-transformers](https://github.com/UKPLab/sentence-transformers)) based on a **BERT**
architecture ([Reimers and Gurevych, 2019](https://arxiv.org/abs/1908.10084)[^1]). It then computes
the **dot product** between the utterance embedding and all other utterances in the dataset
(training and evaluation). The most similar examples are presented to the user along with a
similarity score, which represents the **cosine similarity**. A score of 1 indicates identical
utterances.

### Smart Tags

#### No Close Tags

According to the cosine similarity, some utterances will have very few close neighbors. When the
closest utterance in a set (training or evaluation) is below 0.5, the utterance gets tagged with
`no_close_train` and/or `no_close_eval`, according to the set.

#### Few Similar Tags

When looking at the most similar examples, it can be useful to assess whether they come from the
**same or different classes**. When most similar utterances are from a different class, it might
indicate a mislabeling issue, overlapping classes, data drift, or simply a difficult utterance to
predict.

As such, two [smart tags](./smart-tags.md) highlight the trickiest utterances, based on the **label
heterogeneity of the neighborhood** in each set (training or evaluation). If an utterance has 90% or
more of its most similar examples in a set belonging to a different class, it will be tagged
as `conflicting_neighbors_train` and/or `conflicting_neighbors_eval`, based on which set it is.

### Configuration

[:material-link: Similarity Analysis Configuration](../reference/configuration/similarity.md)
details how to change the encoder to compute the similarity, and the two thresholds used to
determine the smart tags.

[^1]: Reimers, Nils, and Iryna Gurevych. "Sentence-bert: Sentence embeddings using siamese
bert-networks." arXiv preprint arXiv:1908.10084 (2019).

--8<-- "includes/abbreviations.md"
