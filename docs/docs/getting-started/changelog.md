# Releases

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
  Clouds" [here](../user-guide/exploration-space/performance-overview.md).

## [2.0.0] - 2022-04-12

First public release.
