# Releases

## [2.4.0] - 2022-10-20

### Added
- **New dataset warning**: Added new class imbalance warnings.
- **Pipeline Comparison**: Added a new comparison mode in the pipeline metrics table to compare the metrics on different pipelines.
- **New Smart Tag Analysis**: Added a new plot where smart tags and classes can easily be compared in one view.

### Changed
- **Renaming**: Some sections were renamed in the UI, such as:
  - Dataset Class Distribution Analysis -> Dataset Warnings
  - Performance Analysis -> Pipeline Metrics by Data Subpopulation
  - Performance Overview -> Prediction Overview
- **Proposed actions**: a new action was added: `merge_classes`, and `consider_new_class` was renamed to `define_new_class`.
- **Improved Confusion Matrix**: The order of the classes in the confusion matrix is now smarter: classes where the model gets similarly confused will be closer to one another. The rejection class is always the last row/column in the confusion matrix. A toggle allows the user to keep the original order from the dataset if preferred.
- **Refactoring**: We improved the `MetricsPerFilter` module (which generate the pipeline metrics by data subpopulation table). It now takes ~5 times less time to compute.
- **New config fields**: The memory of the dask cluster can now be set to large (12GB) for bigger models. The config can also be in read-only mode, to avoid that users change its values.
- **Offline Mode**: Azimuth can now be launched without internet.

### Fixed
- Fixed an issue related to HuggingFace where filtering on an empty dataset would result in an error.


## [2.3.0] - 2022-08-17

### Added
- Rows of Performance Analysis table now link to exploration page with filters applied, when the user clicks.
- Added visual bars to the similarity column in the semantically similar utterances.
- New attribute in the config allows users to change the thresholds that determine a short or long sentence.

### Fixed
- Fixed utterances table poorly showing ids greater than 9999.
- Fixed filtering of aggregation modules without post-processing.
- Fixed high_epistemic_uncertainty smart tag which wasn't showing in the UI.
- Fixed crash when hitting `See more` when it would show over 100 rows in Performance Analysis table.

## [2.2.3] - 2022-07-25

### Fixed

- Fixed losing hidden columns from Performance Analysis table when changing view (Label, Prediction, etc.).
- Fixed utterances table poorly showing ids greater than 99, now supporting up to 9999.

## [2.2.2] - 2022-07-19

### Fixed

- Fixed losing hidden columns when sorting Performance Analysis table, clicking `See more`/`less`, or switching dataset split or pipeline.

## [2.2.1] - 2022-07-15

### Fixed

- Fixed pipeline comparison smart tag family not working as a filter on the Exploration space.

## [2.2.0] - 2022-07-08

### Added

- Contextual information has been added to most functionalities, linking directly to the relevant documentation.
- The F1 metric was added as a default metric.

### Changed

- Smart tags are now grouped in families, so it is easier to digest them. This also impacts how filters are displayed.
- The confusion matrix can be shown with raw values (not just normalized).
- We now show the top 20, instead of 10, most similar examples in the utterances details.
- Renamed our docker images to use `servicenowdocker` registry on Docker Hub.

##### Performance Overview Table
- Columns can be temporarily hidden.
- Use outcomes' icons as headers instead of the outcomes' full names.
- Added visual bars, so it is easier to analyze the model's performance.

## [2.1.1] - 2022-06-06

### Changed

- Our Docker images are now available through Docker Hub
    - Renamed our docker images to use `servicenowdocker` registry on Docker Hub.
    - Users can now use `make launch` instead of `make compose`.
- Add option `DEVICE=auto` to automatically run Azimuth on GPU if available. As such, `DEVICE=cpu`
  or `DEVICE=gpu` does not need to be specified.
- We added analytics in our documentation, which will add a pop-up to accept cookies when users
  first access the page.

### Fixed

- Fixed issue where the performance analysis table showed empty results for some smart tags.
- Fixed `BEHAVIORAL_TESTING` environment variable.
- Fixed unexpected borders in Performance Analysis table.
- Fixed proposed actions which couldn't be applied on an utterance in the latest release.

## [2.1.0] - 2022-05-27

- Ability to get predictions without postprocessing in the exploration space. See section "Excluding
  Post-Processing" [here](../user-guide/exploration-space/index.md).
- New Smart Tags `pipeline_disagreement` and `incorrect_for_all_pipelines` as a first step for
  pipeline comparison. See section "Pipeline Comparison" [here](../key-concepts/smart-tags.md).
- Links on top words to filter utterances that contain it. See the section "Word
  Clouds" [here](../user-guide/exploration-space/prediction-overview.md).

## [2.0.0] - 2022-04-12

First public release.
