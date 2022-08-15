# Syntax Analysis

## What is it?

The syntax of an utterance usually refers to its structure, such as how ideas and words are ordered
in a sentence. Azimuth provides smart tags based on the length and syntactic structure of
utterances.

## Where is this used in Azimuth?

Based on the syntax of each utterance, Azimuth computes syntactic [:material-link: Smart
Tags](smart-tags.md) (Extreme Length and Partial Syntax families). Additionally, the
**length mismatch plot** in the
[:material-link: Dataset Class Distribution Analysis](../user-guide/dataset-warnings.md) compares
the length of the utterances in the training set and the evaluation set.

## How is it computed?

### POS Tags

**Part-of-speech** (POS) tagging is a common technique to tag each word in a given text as belonging
to a category according to its grammatical properties. Examples could be 'verb', or 'direct object'.

Azimuth uses [spaCy](https://github.com/explosion/spaCy), an open-source library, to perform POS
tagging on each token of an utterance. It is currently set up for **English**
only.

```python
import spacy
from spacy.lang.en import English

# Sentencizer
spacy_pipeline = English()
spacy_pipeline.add_pipe("sentencizer")  # (5)

# Part of Speech
subj_tags = ["nsubj", "nsubjpass"]  # (1)
obj_tags = ["dobj", "pobj", "dobj"]  # (2)
verb_tags = ["VERB", "AUX"]  # (3)
spacy_pos = spacy.load("en_core_web_sm")  # (4)
```

1. Tags to detect a subject in a sentence.
2. Tags to detect an object in a sentence.
3. Tags to detect a verb in a sentence.
4. Parser to determine the POS tags in an utterance.
5. Used to compute the number of sentences in an utterance.

Based on this, the following smart tags are computed: `multiple_sentences`, `missing_subj`
, `missing_verb` and `missing_obj`.

### Token Count

To compute the number of tokens per utterance, the following **tokenizer** is used:

```python
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")
```

Based on the token count, the `long_sentence` and `short_sentence` smart tags are computed.

## Configuration

[:material-link: Syntax Analysis Config](../reference/configuration/analyses/syntax.md)
explains how to edit the thresholds to determine what is considered a short and long sentence.


--8<-- "includes/abbreviations.md"
