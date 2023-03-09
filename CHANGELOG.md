# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Released changes are shown in the
[documentation release notes](docs/docs/getting-started/changelog.md).

## [Not released]

### Added
- Persistent id.
- New fields in config page.
- The initial config file and all subsequent changes are saved in the caching folder.
- Outcome option to dropdown in Smart Tag Analysis.
- Link from confusion matrix cells and row/column labels to utterance table.
- Preserve edits done to the config via the API when relaunching Azimuth with the env var `LOAD_CONFIG_HISTORY=1`.
- Support for dataset-only smart tag analysis.

### Changed
- Change the outcome per threshold bar chart to area chart, making the x axis continuous, and add vertical dashed line marking current threshold.

### Deprecated/Breaking Changes

### Removed

### Fixed
- Fix Utterance Details page collapsing with extra long utterances.

### Security
