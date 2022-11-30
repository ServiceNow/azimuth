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

Azimuth uses [spaCy](https://github.com/explosion/spaCy), an open-source library, to perform
part-of-speech (POS) and dependency tagging on each token of an utterance. It is set up for all
languages supported by Azimuth. Azimuth then computes the smart tags `missing_subj`, `missing_verb`,
and `missing_obj` based on the presence of certain tags. Subjects and objects are identified by
dependency tags that are language-dependent and specified in the
[:material-link: Syntax Analysis Config](../reference/configuration/analyses/syntax.md), whereas
verbs are identified by POS tags that are consistent across languages (shown below). The smart
tag `multiple_sentences` is based on a spaCy sentencizer:

```python
import spacy
from spacy.lang.en import English

# Part of Speech
verb_tags = ["VERB", "AUX"]

# Sentencizer; English() should work for other languages that have similar sentence conventions.
spacy_pipeline = English()
spacy_pipeline.add_pipe("sentencizer")
```

### Token Count

To compute the number of tokens per utterance, the following **tokenizer** is used:

```python
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")
```

Based on the token count, the `long_sentence` and `short_sentence` smart tags are computed.

## Configuration

[:material-link: Syntax Analysis Config](../reference/configuration/analyses/syntax.md)
explains how to edit the thresholds to determine what is considered a short or long sentence,
the tags used to detect subjects and objects, and the spaCy model used to parse utterances.


--8<-- "includes/abbreviations.md"
