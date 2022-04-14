# Configuration

The Azimuth configuration allows defining different fields, some mandatory, that will customize
Azimuth.

We grouped the fields in config scopes based on what they control. All classes inherit from one
another in a chain, the last one being `AzimuthConfig`, which contains all fields.

To help with detecting the mandatory fields in the config, the following legend is shown throughout
the reference.

* :red_circle: : **Mandatory** fields in the config.
* :orange_circle: : Only **mandatory** if Azimuth is used to analyze **models**, and not just a
  dataset.
* :yellow_circle: : **Usually mandatory** fields, but default values exist that may work for some
  use cases.
* :blue_circle: : The **default values** should work for most use cases.

## Config Scopes

1. [:material-link: Project Config](./project.md) :red_circle:
    * Mandatory fields to define the name of the project and the dataset information.
2. [:material-link: Model Contract Config](./model_contract.md) :orange_circle:
    * Defines how Azimuth interacts with the models/pipelines.
3. [:material-link: Common Fields Config](./common.md) :blue_circle:
    * Fields that are common to many applications (batch size for example).
4. [:material-link: Customize Azimuth Analyses](analyses/index.md):
   In these sections, different analyses in Azimuth can be configured.
    1. [:material-link: Behavioral Testing Config](analyses/behavioral_testing.md) :blue_circle:
        * Defines how the behavioral tests are generated.
    2. [:material-link: Similarity Analysis Config](analyses/similarity.md) :blue_circle:
        * Modifies the similarity analysis.
    3. [:material-link: Dataset Class Distribution Analysis Config](analyses/dataset_warnings.md)
       :blue_circle:
        * Configure Dataset Class Distribution Analysis.

--8<-- "includes/abbreviations.md"
