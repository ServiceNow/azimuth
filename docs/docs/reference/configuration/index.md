# Configuration

The Azimuth configuration allows defining different fields, some mandatory, that will customize
Azimuth.

We grouped the fields in config scopes based on what they control. All classes inherit from one
another in a chain, the last one being `AzimuthConfig`, which contains all fields.

To help with detecting the mandatory fields in the config, the following legend is shown throughout
the reference.

* 🔴 : **Mandatory** fields in the config.
* 🟠 : Only **mandatory** if Azimuth is used to analyze **models**, and not just a
  dataset.
* 🟡 : **Usually mandatory** fields, but default values exist that may work for some
  use cases.
* 🔵 : The **default values** should work for most use cases.

## Config Scopes

1. [:material-link: Project Config](./project.md) 🔴
    * Mainly mandatory fields to define the name of the project and the dataset information.
2. [:material-link: Language Config](./language.md) 🟡
    * Specifies the model and dataset language used to set several language-based defaults.
3. [:material-link: Model Contract Config](./model_contract.md) 🟠
    * Defines how Azimuth interacts with the models/pipelines.
4. [:material-link: Common Fields Config](./common.md) 🔵
    * Fields that are common to many applications (batch size for example).
5. [:material-link: Customize Azimuth Analyses](analyses/index.md):
   In these sections, different analyses in Azimuth can be configured.
    1. [:material-link: Behavioral Testing Config](analyses/behavioral_testing.md) 🔵
        * Defines how the behavioral tests are generated.
    2. [:material-link: Similarity Analysis Config](analyses/similarity.md) 🔵
        * Modifies the similarity analysis.
    3. [:material-link: Dataset Warnings Config](analyses/dataset_warnings.md) 🔵
        * Configure the dataset warnings.
    4. [:material-link: Syntax Analysis Config](analyses/syntax.md) 🔵
        * Modify the defaults for the syntax analysis.

--8<-- "includes/abbreviations.md"
