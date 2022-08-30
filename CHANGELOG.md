# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Released changes are shown in the
[documentation release notes](docs/docs/getting-started/changelog.md).

## [Not released]

### Added
Added a new page to compare different pipelines in the performance analysis table.

### Changed
- Added a proposed action: `merge_classes`, and rename `consider_new_class` to `define_new_class`.
- The order of the classes in the confusion matrix is now smarter: classes where the model gets similarly confused will be closer to one another. The rejection class is always the last row/column in the confusion matrix. A toggle allows the user to keep the original order from the dataset if preferred.

### Deprecated/Breaking Changes

### Removed

### Fixed

### Security
