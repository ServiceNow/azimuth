# Analyses Customization

Three analyses can be configured in Azimuth. Go to each relevant section to know more about the
different attributes that can be defined.

=== "Class Definition"

    ```python
    class PerturbationTestingScope(ModelContractConfig):
        behavioral_testing: Optional[BehavioralTestingOptions] = Field(
            BehavioralTestingOptions(), env="BEHAVIORAL_TESTING"
        )


    class SimilarityConfig(CommonFieldsConfig):
        similarity: Optional[SimilarityOptions] = Field(
            SimilarityOptions(), env="SIMILARITY")


    class DatasetWarningConfig(CommonFieldsConfig):
        dataset_warnings: DatasetWarningsOptions = DatasetWarningsOptions()
    ```

=== "Config Example"

    This will disable both behavioral testing and similarity analysis in Azimuth.

    ```json
    {
      "behavioral_testing": null,
      "similarity": null
    }
    ```

--8<-- "includes/abbreviations.md"
