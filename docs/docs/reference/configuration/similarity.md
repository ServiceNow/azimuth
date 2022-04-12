# Similarity Analysis

In Key Concepts, [:material-link: Similarity Analysis](../../key-concepts/similarity.md) explains
how the different configuration attributes will affect the analysis results.

If your machine does not have a lot of computing power, `similarity` can be set to `null`. It can be
enabled later on in the application.

=== "Available Attributes"

    ```python
    class SimilarityOptions(BaseModel):
        faiss_encoder: str = "all-MiniLM-L12-v2"
        few_similar_threshold: float = 0.9
        no_close_threshold: float = 0.5
    ```

=== "Modifying Values in the Config"

    ```json
    {"similarity": {"faiss_encoder": "your_encoder"}}
    ```

=== "Disabling Similarity Analysis"

    ```json
    {"similarity": null}
    ```

The name of your encoder must be supported by
[sentence-transformers](https://github.com/UKPLab/sentence-transformers).
