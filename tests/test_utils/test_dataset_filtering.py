# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
import math

import pytest

from azimuth.types import DatasetColumn, DatasetFilters
from azimuth.types.outcomes import OutcomeName
from azimuth.types.tag import ALL_SMART_TAGS, DataAction, SmartTag
from azimuth.utils.filtering import filter_dataset_split


def test_dataset_filtering(text_dm_with_tags, simple_text_config, simple_table_key):
    ds = text_dm_with_tags.get_dataset_split(simple_table_key)

    ds_len = {}

    def filtered_len(tf: DatasetFilters) -> int:
        ds_filtered = filter_dataset_split(ds, tf, config=text_dm_with_tags.config)
        ds_len[(tuple(tf.labels), tuple(tf.predictions))] = len(ds_filtered)
        return len(ds_filtered)

    assert filtered_len(DatasetFilters()) == len(ds)
    assert filtered_len(DatasetFilters(confidence_min=0.5)) == len(ds) // 2
    assert filtered_len(DatasetFilters(confidence_max=0.5)) == len(ds) // 2 + 1
    assert filtered_len(DatasetFilters(labels=[0])) == 22
    assert filtered_len(DatasetFilters(data_actions=[DataAction.relabel])) == 1
    assert filtered_len(DatasetFilters(outcomes=[OutcomeName.IncorrectAndRejected])) == 22
    assert filtered_len(DatasetFilters(smart_tags=[SmartTag.short])) == 1
    assert filtered_len(DatasetFilters(utterance="some")) == 2
    assert filtered_len(DatasetFilters(predictions=[1])) == 10

    # We can filter by combinations of filter
    combination_len = filtered_len(DatasetFilters(labels=[0], predictions=[1]))
    assert combination_len == 6
    assert combination_len < min(ds_len[((), (1,))], ds_len[((0,), ())])


def test_dataset_filtering_errors(text_dm_with_tags, simple_text_config, simple_table_key):
    ds = text_dm_with_tags.get_dataset_split(simple_table_key)
    ds = ds.rename_column(DatasetColumn.postprocessed_prediction, "col1")
    ds = ds.rename_column("label", "col2")
    ds = ds.rename_column(text_dm_with_tags.config.columns.text_input, "col3")
    ds = ds.rename_column(DatasetColumn.postprocessed_outcome, "col4")
    ds = ds.rename_column(DatasetColumn.postprocessed_confidences, "col5")

    with pytest.raises(ValueError) as e:
        _ = filter_dataset_split(
            ds, DatasetFilters(predictions=[0]), config=text_dm_with_tags.config
        )
    assert DatasetColumn.postprocessed_prediction in str(e.value)

    with pytest.raises(ValueError) as e:
        _ = filter_dataset_split(
            ds, DatasetFilters(utterance="substring"), config=text_dm_with_tags.config
        )
    assert "utterance" in str(e.value)

    with pytest.raises(ValueError) as e:
        _ = filter_dataset_split(ds, DatasetFilters(labels=[1]), config=text_dm_with_tags.config)
    assert "label" in str(e.value)

    with pytest.raises(KeyError) as e:
        _ = filter_dataset_split(
            ds,
            DatasetFilters(outcomes=[OutcomeName.IncorrectAndRejected]),
            config=text_dm_with_tags.config,
        )
    assert DatasetColumn.postprocessed_outcome in str(e.value)

    with pytest.raises(KeyError) as e:
        _ = filter_dataset_split(
            ds, DatasetFilters(confidence_max=0.5), config=text_dm_with_tags.config
        )
    assert DatasetColumn.postprocessed_confidences in str(e.value)


def test_dataset_filtering_multi(text_dm_with_tags, simple_table_key):
    ds = text_dm_with_tags.get_dataset_split(simple_table_key)

    # We can filter by nothing!
    filters = DatasetFilters()
    ds_filtered = filter_dataset_split(ds, filters, config=text_dm_with_tags.config)
    assert len(ds_filtered) == len(ds)

    # We can filter by multiple targets ie does nothing in this case.
    ds_filtered = filter_dataset_split(
        ds, DatasetFilters(labels=[0, 1]), config=text_dm_with_tags.config
    )
    assert len(ds) == len(ds_filtered)

    # We can filter by multiple preds, will remove the rejection class from preds
    ds_filtered = filter_dataset_split(
        ds, DatasetFilters(predictions=[0, 1]), config=text_dm_with_tags.config
    )
    num_rejection_class = sum(
        p != -1
        for p in text_dm_with_tags.get_dataset_split(simple_table_key)[
            DatasetColumn.postprocessed_prediction
        ]
    )
    assert num_rejection_class == len(ds_filtered)


def test_dataset_filtering_no_smart_tag(text_dm_with_tags, simple_table_key):
    # Reset all tags to False for the first utterance, to ensure that at least one row is
    # associated with no smart tags.
    [
        text_dm_with_tags.add_tags(
            {0: {smart_tag: False}},
            table_key=simple_table_key,
        )
        for smart_tag in ALL_SMART_TAGS
    ]

    ds_filtered = filter_dataset_split(
        text_dm_with_tags.get_dataset_split(simple_table_key),
        DatasetFilters(smart_tags=["NO_SMART_TAGS"]),
        config=text_dm_with_tags.config,
    )
    assert len(ds_filtered) > 0
    assert len(ds_filtered.filter(lambda x: any(x[v] for v in ALL_SMART_TAGS))) == 0


def test_dataset_filtering_confidence(text_dm_with_tags, simple_table_key):
    ds = text_dm_with_tags.get_dataset_split(simple_table_key)
    ds_filtered = filter_dataset_split(
        ds, DatasetFilters(confidence_min=0.4, confidence_max=0.6), config=text_dm_with_tags.config
    )
    assert len(ds_filtered) == math.ceil(len(ds) / 5)
    assert (
        len(
            ds_filtered.filter(
                lambda x: not 0.4 <= x[DatasetColumn.postprocessed_confidences][0] <= 0.6
            )
        )
        == 0
    )


def test_dataset_filtering_mutually_exclusive(text_dm_with_tags, simple_table_key):
    ds = text_dm_with_tags.get_dataset_split(simple_table_key)
    ds_filtered = filter_dataset_split(
        ds,
        DatasetFilters(smart_tags=["NO_SMART_TAGS", "short_sentence"]),
        config=text_dm_with_tags.config,
    )
    assert len(ds_filtered) == 0


def test_dataset_filtering_without_postprocessing(text_dm_with_tags, simple_table_key):
    ds = text_dm_with_tags.get_dataset_split(simple_table_key)
    ds_filtered_with_postprocessing = filter_dataset_split(
        ds,
        DatasetFilters(predictions=[0]),
        config=text_dm_with_tags.config,
    )
    ds_filtered_without_postprocessing = filter_dataset_split(
        ds,
        DatasetFilters(predictions=[0]),
        config=text_dm_with_tags.config,
        without_postprocessing=True,
    )
    assert len(ds_filtered_with_postprocessing) != len(ds_filtered_without_postprocessing)


if __name__ == "__main__":
    pytest.main()
