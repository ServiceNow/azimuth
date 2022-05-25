# Tests

Run tests with `make test`.

    Reminder, when running router tests, don't forget to clean the cache before, either
    with `make clean` or `rm -r /tmp/azimuth_test_cache`.

## Different Fixtures

Fixtures mentioned here are in `conftest.py`. Functions are in `utils.py`.

### Configs

#### Sentiment Analysis

Most of our tests use a version of the sentiment analysis dataset and a model with random weights.
The dataset has 2 labels: `positive` and `negative`. The pipeline can predict the `REJECTION_CLASS`
if the threshold is set higher than 0.5.

* `simple_text_config` is the 'base' config. The dataset is quite big for tests (42 samples in each
  split), and should not be used for computationally intensive tests. However, it can be useful if
  the test needs a diversity of data point. It can be coupled with `apply_mocked_startup_task`, if
  the prediction data can be mocked (see below).
    * `simple_text_config_multi_pipeline` is the same but have 2 pipelines with a different
      threshold.
* `tiny_text_config` is the same as `simple_text_config`, but only have 2 samples in each split.
  This is useful for tasks that don't need a diversity of data points, but might need the real
  prediction results (instead of mocked). See the functions `save_predictions`
  and `save_outcomes` below.
    * `tiny_text_config_no_train`: No training set.
    * `tiny_text_config_no_pipeline`: No pipeline.

#### Intent Classification

Some tests need to test other model contracts than `hf_text_classification`, or might need more than
2 classes. The following fixtures can be useful for that.

* File-based configs are useful to test modules where you expect a given result based on specific
  values in the dataset (Ex: Determining outcomes based on predictions).
    * `file_text_config_top1` is the most useful, with a simple use case of a single prediction. It
      has 5 classes, 6 samples in eval and 8 samples in train.
    * `file_text_config_top3` is only useful to test the top3 implementation of the file-based
      module.
    * `file_text_config_no_intent` is only useful to test the file-based module with no_intent.
* `clinc_text_config` is mostly useful to test that the clinc dataset can be loaded, but can also be
  used in other tests, where it is useful to look at the dataset (it is
  under `fixtures/sample_CLINC150.json`). It has 16 classes according to the config, but only data
  for 3 classes in the subset. It has 6 samples in the training set and 5 in the evaluation set.
* `guse_text_config` is mostly useful to test the `CustomTextClassificationModule`.

### Predictions

#### Mocking DatasetSplitManager and Start-Up Tasks

* If the predictions, outcomes, tags (and so on) can be mocked for the test, you can use the
  fixture `apply_mocked_startup_task`. By default, it should be paired with `simple_text_config`.
  However, you can run it on any config, by adding `apply_mocked_startup_task(config)` at the
  beginning of the test.
* If you don't need the 2 dataset split managers (train and eval), and just need a
  mocked `DatasetSplitManager`, you can simply call in your test: `dm = generate_mocked_dm(config)`.

#### Saving real predictions and outcomes

* If the predictions and outcomes should be real (not mocked), you can use the
  functions `save_predictions(config)` and `save_outcomes(config)` at the beginning of the test. It
  will call the prediction and outcomes module on the config, and save them in the dataset.

#### Table Key

* To get a table key, you can use the function `get_table_key(config)`.

### Task Manager and Dask Client

* If your test needs a Dask Client, you can add the fixture `dask_client`.
* If your test needs a TaskManager (most don't), `tiny_text_task_manager` is set up to work with
  the `tiny_text_config`. Use both for the tests.
