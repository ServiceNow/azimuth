# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import numpy as np

from azimuth.modules.model_performance.confusion_matrix import ConfusionMatrixModule
from azimuth.types import DatasetFilters, DatasetSplitName, ModuleOptions
from tests.utils import save_predictions


def test_confusion_matrix(tiny_text_config):
    save_predictions(tiny_text_config)

    # Basic confusion matrix
    mod = ConfusionMatrixModule(
        DatasetSplitName.eval,
        tiny_text_config,
        mod_options=ModuleOptions(pipeline_index=0),
    )
    [json_output] = mod.compute_on_dataset_split()

    dm = mod.get_dataset_split_manager()
    assert json_output.confusion_matrix.shape == (dm.get_num_classes(), dm.get_num_classes())
    # All row sums to one except the last one because it is rejection class
    assert np.allclose(json_output.confusion_matrix.sum(-1)[:-1], 1.0)
    assert json_output.class_names == dm.get_class_names()

    # Filtered confusion matrix
    mod_filter = ConfusionMatrixModule(
        DatasetSplitName.eval,
        tiny_text_config,
        mod_options=ModuleOptions(filters=DatasetFilters(label=[0]), pipeline_index=0),
    )
    [json_output_filter] = mod_filter.compute_on_dataset_split()

    # A row sums to 0.
    assert any(json_output_filter.confusion_matrix.sum(-1) == 0)
    assert json_output_filter.class_names == dm.get_class_names()

    # Confusion matrix without postprocessing
    mod_without_postprocessing = ConfusionMatrixModule(
        DatasetSplitName.eval,
        tiny_text_config,
        mod_options=ModuleOptions(pipeline_index=0, without_postprocessing=True),
    )
    [json_output_without_postprocessing] = mod_without_postprocessing.compute_on_dataset_split()

    # Last column (REJECTION_CLASS) should be not empty by default, but empty without postprocessing
    assert json_output.confusion_matrix.sum(0)[2] > 0
    assert json_output_without_postprocessing.confusion_matrix.sum(0)[2] == 0

    # When not normalized, we get the predictions.
    mod_not_normalized = ConfusionMatrixModule(
        DatasetSplitName.eval,
        tiny_text_config,
        mod_options=ModuleOptions(pipeline_index=0, cf_normalized=False),
    )
    [json_output_not_normalized] = mod_not_normalized.compute_on_dataset_split()
    assert json_output_not_normalized.confusion_matrix.sum() == dm.num_rows


def test_confusion_matrix_reorder_rejection_class(guse_text_config):
    # Setting high threshold to make sure everything gets predicted as NO_INTENT
    guse_text_config.pipelines[0].postprocessors[-1].threshold = 1
    save_predictions(guse_text_config)

    # Basic confusion matrix
    mod = ConfusionMatrixModule(
        DatasetSplitName.eval,
        guse_text_config,
        mod_options=ModuleOptions(pipeline_index=0),
    )
    [json_output] = mod.compute_on_dataset_split()

    dm = mod.get_dataset_split_manager()

    # Assert that the rejection class in not the last one already
    assert dm.rejection_class_idx != dm.get_num_classes() - 1
    # Assert that the confusion matrix is empty for all columns except the last one.
    assert sum(sum(json_output.confusion_matrix[:, :-1])) == 0
    assert sum(json_output.confusion_matrix[:, -1]) > 0
    # Assert the rejection class is last in the class names
    assert json_output.class_names[-1] == dm.get_class_names()[dm.rejection_class_idx]
