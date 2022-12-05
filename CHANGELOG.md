# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Released changes are shown in the
[documentation release notes](docs/docs/getting-started/changelog.md).

## [Not released]

### Added
- Azimuth now works on French datasets (and pipelines)! Language can be selected in the config,
  and language-specific defaults for syntax-tagging and behavioral tests (neutral tokens) will be
  set dynamically (or can be altered manually).
- New class overlap section, with class overlap detection. More details are available in the User Guide and in the Key Concepts.
- Pipeline pre/post-processing steps breakdown in the utterance detail page.

### Changed
- The default port for the front end will now be 3000, the React default, instead of 3005.
- Improved class overlap threshold number picker.
  - Control input value with a `string` instead of with a `number` so for example when hitting backspace after `0.01`, you get `0.0` instead of `0` (as maybe you wanted to type `2` and get `0.02`).
  - Debounce number picker to reduce calls to back end.

### Deprecated/Breaking Changes

### Removed

### Fixed
- ONNX models on GPU.
- Preserve white spaces in utterances. That includes `\n`s, `\t`s, and consecutive spaces.
- Fix predictions with 100% confidence not showing up in the confidence histogram and in the ECE.

### Security
