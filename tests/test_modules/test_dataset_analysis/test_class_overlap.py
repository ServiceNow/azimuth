# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import numpy as np
from sklearn.preprocessing import normalize

import azimuth.modules.base_classes.artifact_manager as artifact_manager
from azimuth.modules.dataset_analysis.class_overlap import ClassOverlapModule
from azimuth.types import DatasetSplitName
from azimuth.types.class_overlap import ClassOverlapResponse


class MockedTransformer:
    def __init__(self, name, num_features: int = 123):
        self.num_features = num_features

    def encode(self, x, *args, **kwargs):
        return normalize(np.random.rand(len(x), self.num_features), axis=1, norm="l1")


def test_incomplete_class_set(clinc_text_config, dask_client, monkeypatch):
    monkeypatch.setattr(artifact_manager, "SentenceTransformer", MockedTransformer)
    # Mock SentenceTransformer on all workers.
    dask_client.run(
        lambda: monkeypatch.setattr(artifact_manager, "SentenceTransformer", MockedTransformer)
    )
    mod = ClassOverlapModule(dataset_split_name=DatasetSplitName.train, config=clinc_text_config)
    result: ClassOverlapResponse = mod.compute_on_dataset_split()
    class_ids = set(mod.get_dataset_split_manager().get_dataset_split()["label"])
    s_matrix = result[0].s_matrix
    matrix_size = s_matrix.shape[0]
    indices_with_overlap = [
        (i, j) for i in range(matrix_size) for j in range(matrix_size) if s_matrix[i, j] > 0
    ]
    assert all(
        [val in class_ids for tup in indices_with_overlap for val in tup]
    ), "Overlap value > 0 for nonexistent class index"
