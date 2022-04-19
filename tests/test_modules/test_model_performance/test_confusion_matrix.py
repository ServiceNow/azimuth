# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import numpy as np

from azimuth.modules.model_performance.confusion_matrix import ConfusionMatrixModule
from azimuth.types.general.dataset import DatasetSplitName
from azimuth.types.general.module_options import DatasetFilters, ModuleOptions


def test_confusion_matrix(simple_text_config, apply_mocked_startup_task):
    mod = ConfusionMatrixModule(
        DatasetSplitName.eval,
        simple_text_config,
    )
    dm = mod.get_dataset_split_manager()

    [json_output] = mod.compute_on_dataset_split()

    assert json_output.confusion_matrix.shape == (dm.get_num_classes(), dm.get_num_classes())
    # All row sums to one except the last one because it is rejection class
    assert np.allclose(json_output.confusion_matrix.sum(-1)[:-1], 1.0)

    mod_filter = ConfusionMatrixModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(filters=DatasetFilters(labels=[0]), pipeline_index=0),
    )

    [json_output_filter] = mod_filter.compute_on_dataset_split()
    # A row sums to 0.
    assert any(json_output_filter.confusion_matrix.sum(-1) == 0)
