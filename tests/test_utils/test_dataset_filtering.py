# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import pytest

from azimuth.types import DatasetColumn, DatasetFilters
from azimuth.types.outcomes import OutcomeName
from azimuth.types.tag import (
    ALL_SMART_TAGS,
    SMART_TAGS_FAMILY_MAPPING,
    DataAction,
    SmartTag,
    SmartTagFamily,
)
from azimuth.utils.filtering import filter_dataset_split
from tests.utils import generate_mocked_dm, get_table_key


def test_dataset_filtering(simple_text_config):
    dm = generate_mocked_dm(simple_text_config)
    ds = dm.get_dataset_split(get_table_key(simple_text_config))

    ds_len = {}

    def filtered_len(tf: DatasetFilters) -> int:
        ds_filtered = filter_dataset_split(ds, tf, config=dm.config)
        ds_len[(tuple(tf.labels), tuple(tf.predictions))] = len(ds_filtered)
        return len(ds_filtered)

    assert filtered_len(DatasetFilters()) == len(ds)
    assert filtered_len(DatasetFilters(confidence_min=0.5)) == 0.9 * len(ds) // 2
    assert filtered_len(DatasetFilters(confidence_max=0.5)) == len(ds) - 0.9 * len(ds) // 2
    assert filtered_len(DatasetFilters(labels=[0])) == 22
    assert filtered_len(DatasetFilters(data_actions=[DataAction.relabel])) == 1
    assert filtered_len(DatasetFilters(outcomes=[OutcomeName.IncorrectAndRejected])) == 33
    assert (
        filtered_len(DatasetFilters(smart_tags={SmartTagFamily.syntactic: [SmartTag.short]})) == 1
    )
    assert filtered_len(DatasetFilters(utterance="some")) == 2
    assert filtered_len(DatasetFilters(predictions=[1])) == 5

    # We can filter by combinations of filter
    combination_len = filtered_len(DatasetFilters(labels=[0], predictions=[1]))
    assert combination_len == 3
    assert combination_len < min(ds_len[((), (1,))], ds_len[((0,), ())])


def test_dataset_filtering_errors(simple_text_config):
    dm = generate_mocked_dm(simple_text_config)
    ds = dm.get_dataset_split(get_table_key(simple_text_config))
    ds = ds.rename_column(DatasetColumn.postprocessed_prediction, "col1")
    ds = ds.rename_column("label", "col2")
    ds = ds.rename_column(dm.config.columns.text_input, "col3")
    ds = ds.rename_column(DatasetColumn.postprocessed_outcome, "col4")
    ds = ds.rename_column(DatasetColumn.postprocessed_confidences, "col5")

    with pytest.raises(ValueError) as e:
        _ = filter_dataset_split(ds, DatasetFilters(predictions=[0]), config=dm.config)
    assert DatasetColumn.postprocessed_prediction in str(e.value)

    with pytest.raises(ValueError) as e:
        _ = filter_dataset_split(ds, DatasetFilters(utterance="substring"), config=dm.config)
    assert "utterance" in str(e.value)

    with pytest.raises(ValueError) as e:
        _ = filter_dataset_split(ds, DatasetFilters(labels=[1]), config=dm.config)
    assert "label" in str(e.value)

    with pytest.raises(ValueError) as e:
        _ = filter_dataset_split(
            ds,
            DatasetFilters(outcomes=[OutcomeName.IncorrectAndRejected]),
            config=dm.config,
        )
    assert DatasetColumn.postprocessed_outcome in str(e.value)

    with pytest.raises(ValueError) as e:
        _ = filter_dataset_split(ds, DatasetFilters(confidence_max=0.5), config=dm.config)
    assert DatasetColumn.postprocessed_confidences in str(e.value)


def test_dataset_filtering_multi(simple_text_config):
    simple_table_key = get_table_key(simple_text_config)
    dm = generate_mocked_dm(simple_text_config)
    ds = dm.get_dataset_split(simple_table_key)

    # We can filter by nothing!
    filters = DatasetFilters()
    ds_filtered = filter_dataset_split(ds, filters, config=dm.config)
    assert len(ds_filtered) == len(ds)

    # We can filter by multiple targets ie does nothing in this case.
    ds_filtered = filter_dataset_split(ds, DatasetFilters(labels=[0, 1]), config=dm.config)
    assert len(ds) == len(ds_filtered)

    # We can filter by multiple preds, will remove the rejection class from preds
    ds_filtered = filter_dataset_split(ds, DatasetFilters(predictions=[0, 1]), config=dm.config)
    num_rejection_class = sum(
        p != dm.rejection_class_idx
        for p in dm.get_dataset_split(simple_table_key)[DatasetColumn.postprocessed_prediction]
    )
    assert num_rejection_class == len(ds_filtered)


@pytest.mark.parametrize(
    "family",
    [
        SmartTagFamily.syntactic,
        SmartTagFamily.similarity,
        SmartTagFamily.behavioral_testing,
        SmartTagFamily.almost_correct,
        SmartTagFamily.uncertainty_estimation,
    ],
)
def test_dataset_filtering_no_smart_tag(simple_text_config, family):
    dm = generate_mocked_dm(simple_text_config)
    simple_table_key = get_table_key(simple_text_config)
    # Reset all tags to False for the first utterance, to ensure that at least one row is
    # associated with no smart tags.
    [
        dm.add_tags(
            {0: {smart_tag: False}},
            table_key=simple_table_key,
        )
        for smart_tag in ALL_SMART_TAGS
    ]

    ds_filtered = filter_dataset_split(
        dm.get_dataset_split(simple_table_key),
        DatasetFilters(smart_tags={family: ["NO_SMART_TAGS"]}),
        config=dm.config,
    )
    assert len(ds_filtered) > 0
    assert (
        len(ds_filtered.filter(lambda x: any(x[v] for v in SMART_TAGS_FAMILY_MAPPING[family]))) == 0
    )


def test_dataset_filtering_confidence(simple_text_config):
    dm = generate_mocked_dm(simple_text_config)
    ds = dm.get_dataset_split(get_table_key(simple_text_config))
    ds_filtered = filter_dataset_split(
        ds, DatasetFilters(confidence_min=0.4, confidence_max=0.6), config=dm.config
    )
    assert len(ds_filtered) == 10
    assert (
        len(
            ds_filtered.filter(
                lambda x: not 0.4 <= x[DatasetColumn.postprocessed_confidences][0] <= 0.6
            )
        )
        == 0
    )


def test_dataset_filtering_mutually_exclusive(simple_text_config):
    dm = generate_mocked_dm(simple_text_config)
    ds = dm.get_dataset_split(get_table_key(simple_text_config))
    ds_filtered = filter_dataset_split(
        ds,
        DatasetFilters(
            smart_tags={SmartTagFamily.extreme_length: ["NO_SMART_TAGS", "short_sentence"]}
        ),
        config=dm.config,
    )
    assert len(ds_filtered) == 0


def test_dataset_filtering_without_postprocessing(simple_text_config):
    dm = generate_mocked_dm(simple_text_config)
    ds = dm.get_dataset_split(get_table_key(simple_text_config))
    ds_filtered_with_postprocessing = filter_dataset_split(
        ds,
        DatasetFilters(predictions=[0]),
        config=dm.config,
    )
    ds_filtered_without_postprocessing = filter_dataset_split(
        ds,
        DatasetFilters(predictions=[0]),
        config=dm.config,
        without_postprocessing=True,
    )
    assert len(ds_filtered_with_postprocessing) != len(ds_filtered_without_postprocessing)


if __name__ == "__main__":
    pytest.main()
