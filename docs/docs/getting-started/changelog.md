# Releases

## [2.8.0] - 2023-07-TODO

### Added
- Config UI:
  - Two buttons in the config UI to import/export a JSON config file.
  - Drop-down menu to load a previous config.
  - Discard buttons to individual config fields.
- HF pipelines:
  - The saliency layer is now automatically detected and no longer needs to be specified in the config. To disable saliency maps, the user can still specify `null`.

## [2.7.0] - 2023-06-12

### Added
- Support for no dataset at startup, in which case the UI will prompt the user to configure Azimuth from the config UI.
- Support for customizing, adding, and removing some pipelines, postprocessors, and metrics from the config UI.
- Meaningful error messages in the error toasts.

### Changed
- When clicking on an utterance from the Exploration space's Utterance Table, the Utterance Details now open in a modal on top of the table. This preserves the context of the filtering and sorting and allows for going through the utterances one by one, using some new arrow buttons or keyboard arrows.

## [2.6.1] - 2023-04-20

### Changed
- All tasks that might use a GPU (when `use_cuda` is enabled) will be queued on the same Dask worker, so no two tasks try to use the GPU memory at the same time. This is especially useful if the environment has a single GPU and the model takes up all its memory.

### Modified
- General speed improvements.

### Deprecated/Breaking Changes
- The repo now needs `python>=3.9` when used without Docker.

## Fixed
- Fix intermittent issue where tasks could get lost during the startup (`distributed.comm.core.CommClosedError: in <TCP (closed) ConnectionPool.broadcast local=tcp://127.0.0.1:XXXXX remote=tcp://127.0.0.1:XXXXX>: Stream is closed.`).
- Fix config modal closing unexpectedly on unsuccessful config update.
- Fix the `OutcomeCountPerFilter` module that was too slow (regression in 2.6.0).
- Fix breadcrumbs not showing up (regression in 2.6.0).
- Fix validation on the number pickers from the behavioral testing config section.

## [2.6.0] - 2023-03-27

### Added
- **Config history.**
    - The initial config file and all subsequent changes are saved in the caching folder in a `config_history.jsonl` file.
    - Preserve edits to the config executed via the API when relaunching Azimuth with the env var `LOAD_CONFIG_HISTORY=1`.
    - See details in the [Getting Started](c-run.md#2-running-the-app) or the [Development](../development/launching.md#back-end) section.
- **Persistent id.**
    - Users can now specify a persistent id for each utterance that will persist through time.
    - See how to specify it in the column section of the [Project Config](../reference/configuration/project.md#columns).
    - It will be used for exporting/importing proposed actions (See below).
    - If specified, it will be displayed when hovering on the index column in the utterance table, as detailed [here](../user-guide/exploration-space/utterance-table.md#index).
- **Import/Export of proposed actions.**
    - Proposed actions can be exported in a simple CSV file using the persistent id as the key.
    - This allows to import back the proposed actions at any time, including with a new dataset version.
    - See details in the [Utterance table](../user-guide/exploration-space/utterance-table.md#proposed-action) section.
- **New interactions on the Exploration Space.**
    - Link from confusion matrix cells and row/column labels to utterance table. Example provided [here](../user-guide/exploration-space/confusion-matrix.md#interaction).
    - Users can now search for indices or persistent ids in the [utterance search box](../user-guide/exploration-space/index.md#filter-categories).
- **Support for the training set only.**
    - Azimuth can now launch with a training set only.
    - Dataset warnings are now also available with just one split (training or evaluation).
- **Better support for CSV files.** New helper function to load CSV files. Example provided [here](../reference/custom-objects/dataset.md#examples).

### Changed
- **Enhanced config page.** All fields from the config can now be modified from the [settings page](../user-guide/settings.md), allowing to restart some start-up tasks based on the requested changes.
- **Syntax smart tags.**
    - Syntax smart tags are now computed even if utterances have more than one sentence.
    - For that reason, `short_sentence` and `long_sentence` were renamed to `short_utterance` and `long_utterance`. The default value for `long_utterance` was set to 12 words.
    - See details in the [Syntax](../key-concepts/syntax-analysis.md) section.
- **Improved visualizations.**
    - Change the [outcome per threshold bar chart](../user-guide/post-processing-analysis.md) to an area chart, making the x-axis continuous, and add a vertical dashed line marking the current threshold.
    - Add outcome option to the dropdown in [smart tag analysis](../user-guide/smart-tag-analysis.md) on the Dashboard, and display the analysis even when no pipeline is selected.
    - [Word clouds](../user-guide/exploration-space/prediction-overview.md#word-clouds) now uses the language from the config to determine the stop words (it used to only support English).
    - Show short/long utterances on the [word count histogram](../user-guide/dataset-warnings.md#length-mismatch) in dataset warnings.
- **Performance improvements.** A few routes and caching logic were improved, making the app faster.

### Deprecated/Breaking Changes
- **Dependency Update.** Few libraries were updated to reduce security issues. These might cause breaking changes when loading user models and data.
    - Bump `datasets` from 1.16.1 to 2.1.0
    - Bump `tensorflow` from 2.8.0 to 2.11.0
    - Bump `torch` from 1.9.0 to 1.13.1
    - Bump `numpy` to 1.23.5

### Fixed
- Fix the Utterance Details page collapsing with extra long utterances.
- Fix potential time-out issues for bigger datasets and models after start-up.
- Fix browser history after navigating to the exploration page with no pipeline.

### Known Issue
- In the logs, the error message `distributed.comm.core.CommClosedError: in <TCP (closed) ConnectionPool.broadcast local=tcp://127.0.0.1:XXXXX remote=tcp://127.0.0.1:XXXXX>: Stream is closed.` might appear and result in some tasks being lost. In most cases, the lost tasks will be recomputed automatically without causing further errors. However, it might happen that other tasks fail because of missing columns. If that happens, simply kill and restart Azimuth. We are investigating the issue.

## [2.5.3] - 2023-02-16

### Fixed
- Support truncation for HF pipelines.

## [2.5.2] - 2022-12-20

### Fixed
- Show long utterances fully on hover in similar and perturbed utterances tables.
- Fixed webapp crash when there is no pipeline (with `"pipeline": null` configured).
- Fixed sort utterance table by confidence or prediction without post-processing.
- Fixed crash on Safari and iOS browsers as they don't support lookbehind in regular expressions.

## [2.5.1] - 2022-12-05

### Fixed
- Ignore `language` environment variable as we have seen conflicts with it on certain machines.

## [2.5.0] - 2022-12-05

### Added
- **Support for french**: Azimuth now works on French datasets (and pipelines)! Language can be selected in the config, and language-specific defaults for syntax-tagging and behavioral tests (neutral tokens) will be set dynamically (or can be altered manually). [See Reference](../reference/configuration/language.md).
- **Class Overlap**: New class overlap detection section. More details are available in the [User Guide](../user-guide/class-overlap.md) and in the [Key Concepts](../key-concepts/similarity.md).
- **Pre/Post-processing Steps**: The details of the pipeline pre/post-processing steps are now visible in the utterance details page.
- **Accuracy metric**: Accuracy was added as a default metric.

### Changed
- The default port for the front end will now be 3000, the React default, instead of 3005.

### Fixed
- ONNX models on GPU.
- Preserve white spaces in utterances. That includes `\n`s, `\t`s, and consecutive spaces.
- Fix predictions with 100% confidence not showing up in the confidence histogram and in the ECE.

## [2.4.1] - 2022-10-21

### Fixed
- Fixed Smart Tab Analysis table
    - Column headers exceeding plots' width
    - Links to Prediction Overview
    - `Total` row squished when transposed and with a high number of rows

## [2.4.0] - 2022-10-20

### Added
- **New dataset warning**: Added new class imbalance warnings.
- **Pipeline Comparison**: Added a new pipeline comparison mode in the pipeline metrics table to compare the metrics on different pipelines.
- **New Smart Tag Analysis**: Added a new plot where smart tag patterns over classes can be easily examined in one view.
- **New loading screen**: When the start-up tasks are running, a new loading screen displays the status of all the tasks.

### Changed
- **Renaming**: Some sections were renamed in the UI, such as:
    - Dataset Class Distribution Analysis -> Dataset Warnings
    - Performance Analysis -> Pipeline Metrics by Data Subpopulation
    - Performance Overview -> Prediction Overview
- **Proposed actions**: We added a new action, `merge_classes`, and renamed `consider_new_class` to `define_new_class`.
- **Improved Confusion Matrix**: The order of the classes in the confusion matrix is now smarter: classes where the model gets similarly confused will be closer to one another. The rejection class is always the last row/column in the confusion matrix. A toggle allows the user to keep the original order from the dataset if preferred.
- **Refactoring**: We improved the `MetricsPerFilter` module (which generates the pipeline metrics by data subpopulation table). It now takes ~5 times less time to compute.
- **New config fields**: The memory of the dask cluster can now be set to large (12GB) for bigger models. The config can also be in read-only mode, to prevent users from changing its values.
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
