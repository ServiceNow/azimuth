# Similarity Analysis Config

:blue_circle: **Default value:** `SimilarityOptions()`

**Environment Variable**: `SIMILARITY`

In Key Concepts, [:material-link: Similarity Analysis](../../../key-concepts/similarity.md) explains
how the different configuration attributes will affect the analysis results. Note that language-related defaults are dynamically selected based on the language specified in the
[:material-link: Project Config](../project.md) (default is English).

If your machine does not have a lot of computing power, `similarity` can be set to `null`. It can be
enabled later on in the application.

=== "Class Definition"

    ```python
    from pydantic import BaseModel

    class SimilarityOptions(BaseModel):
        faiss_encoder: str = "" # Language-based default value # (1)
        conflicting_neighbors_threshold: float = 0.9 # (2)
        no_close_threshold: float = 0.5 # (3)
    ```

    1. Language model used for utterance embeddings for similarity analysis. The name of your
    encoder must be supported by
    [sentence-transformers](https://github.com/UKPLab/sentence-transformers).
    2. Threshold to determine the ratio of utterances that should belong to another class for the
    smart tags `conflicting_neighbors_train`/`conflicting_neighbors_eval`.
    3. Threshold for cosine similarity for the smart tags `no_close_train`/`no_close_eval`.

=== "Config Example"

    For example, to change the encoder used for utterance embeddings:

    ```json
    {
      "similarity": {
        "faiss_encoder": "your_encoder"
      }
    }
    ```

=== "Disabling Similarity Analysis"

    ```json
    {
      "similarity": null
    }
    ```

=== "English defaults"

    ```python
    # Sentence encoder
    faiss_encoder = "all-MiniLM-L12-v2"
    ```

=== "French defaults"

    ```python
    # Sentence encoder
    faiss_encoder = "distiluse-base-multilingual-cased-v1"
    ```

--8<-- "includes/abbreviations.md"
