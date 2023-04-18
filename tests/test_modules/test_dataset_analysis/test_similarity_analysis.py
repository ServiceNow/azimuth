# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import numpy as np
from sklearn.preprocessing import normalize

import azimuth.modules.dataset_analysis.similarity_analysis as faiss_mod
from azimuth.app import load_dataset_split_managers_from_config
from azimuth.dataset_split_manager import FEATURE_FAISS
from azimuth.modules.dataset_analysis.similarity_analysis import NeighborsTaggingModule
from azimuth.types import DatasetColumn, DatasetSplitName, ModuleOptions
from azimuth.types.tag import SmartTag
from tests.utils import get_table_key, get_tiny_text_config_one_ds_name

IDX = 3


class MockedTransformer:
    def __init__(self, name, num_features: int = 123):
        self.num_features = num_features

    def encode(self, x, *args, **kwargs):
        return normalize(np.random.rand(len(x), self.num_features), axis=1, norm="l1")


def test_neighbors(simple_text_config, dask_client, monkeypatch):
    monkeypatch.setattr(faiss_mod, "SentenceTransformer", MockedTransformer)
    # Mock SentenceTransformer on all workers.
    dask_client.run(
        lambda: monkeypatch.setattr(faiss_mod, "SentenceTransformer", MockedTransformer)
    )
    simple_text_config.similarity.conflicting_neighbors_threshold = 0.1
    simple_table_key = get_table_key(simple_text_config)

    mod = NeighborsTaggingModule(DatasetSplitName.eval, simple_text_config)
    res = mod.compute_on_dataset_split()

    dm = mod.get_dataset_split_manager()
    # Confirm correct length; indices=None should return the result on all indices
    assert (
        len(res) == dm.num_rows
    ), f"Length of result ({len(res)}) does not match length of full dataset"
    mod.save_result(res, dm)

    ds = dm.dataset_split_with_index(simple_table_key)
    embd = np.array(ds["features"][IDX]).reshape([1, -1]).astype(np.float32)
    # The FAISS exists!
    scores, examples = ds.get_nearest_examples(FEATURE_FAISS, embd, k=5)
    # Check that the first item is indeed the real index
    assert IDX in examples[DatasetColumn.row_idx]

    assert any(mod.get_dataset_split()[SmartTag.conflicting_neighbors_train])
    assert any(mod.get_dataset_split()[SmartTag.conflicting_neighbors_eval])
    assert "neighbors_eval" in mod.get_dataset_split().column_names
    assert "no_close_train" in mod.get_dataset_split().column_names

    # Reloading the dataset_split, FAISS is still there.
    dm = load_dataset_split_managers_from_config(simple_text_config)[DatasetSplitName.eval]
    ds = dm.dataset_split_with_index(simple_table_key)
    _ = ds.get_nearest_examples(FEATURE_FAISS, embd, k=5)

    # Confirm that module works with subset of indices
    indices_subset = [1, 2, 3]
    mod_idx_subset = NeighborsTaggingModule(
        DatasetSplitName.eval, simple_text_config, mod_options=ModuleOptions(indices=indices_subset)
    )
    res = mod_idx_subset.compute_on_dataset_split()
    assert len(res) == len(
        indices_subset
    ), f"Length of result ({len(res)}) does not match length of indices ({len(indices_subset)})"
    # Would currently fail on mod.save_result() because of indices (length) mismatch


def test_neighbors_one_ds(tiny_text_config_one_ds, dask_client, monkeypatch):
    monkeypatch.setattr(faiss_mod, "SentenceTransformer", MockedTransformer)
    # Mock SentenceTransformer on all workers.
    dask_client.run(
        lambda: monkeypatch.setattr(faiss_mod, "SentenceTransformer", MockedTransformer)
    )
    tiny_text_config_one_ds.similarity.conflicting_neighbors_threshold = 0.1

    ds_name, other_ds_name = get_tiny_text_config_one_ds_name(tiny_text_config_one_ds)
    mod = NeighborsTaggingModule(ds_name, tiny_text_config_one_ds)
    res = mod.compute_on_dataset_split()

    assert not any([r.tags[f"conflicting_neighbors_{other_ds_name}"] for r in res])
    assert not any([r.tags[f"no_close_{other_ds_name}"] for r in res])
    assert not any([r.adds[f"neighbors_{other_ds_name}"] for r in res])
    assert any([r.adds[f"neighbors_{ds_name}"] for r in res])
