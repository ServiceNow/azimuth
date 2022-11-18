import numpy as np

from azimuth.modules.dataset_analysis.class_overlap import (
    ClassOverlapModule,
    OverlapTaggingModule,
)
from azimuth.types.class_overlap import ClassOverlapResponse
from azimuth.types.general.dataset import DatasetSplitName
from azimuth.types.tag import TaggingResponse
from tests.utils import get_table_key


def test_overlap_compute(simple_text_config, dask_client, monkeypatch):
    mod = ClassOverlapModule(dataset_split_name=DatasetSplitName.train, config=simple_text_config)
    class_overlap_mod_response = [
        ClassOverlapResponse(
            evals=np.array([0] * 3),
            evecs=np.array([0] * 3),
            difference=np.array([0] * 3),
            s_matrix=np.array([[0.5, 0.25, 0.25], [0.25, 0.5, 0.25], [0.25, 0.25, 0.5]]),
            similarity_arrays={
                0: {
                    0: {
                        "sample_probability": np.array([0, 0, 0]),
                        "sample_probability_norm": np.array([10000, 0, 0]),
                    },  # no overlap
                    1: {
                        "sample_probability": np.array([0, 0, 0]),
                        "sample_probability_norm": np.array([5000, 5000, 0]),
                    },  # overlap 1
                    2: {
                        "sample_probability": np.array([0, 0, 0]),
                        "sample_probability_norm": np.array([5000, 2000, 3000]),
                    },  # overlap 1, 2
                },
                1: {
                    3: {
                        "sample_probability": np.array([0, 0, 0]),
                        "sample_probability_norm": np.array([0, 10000, 0]),
                    },  # no overlap
                    4: {
                        "sample_probability": np.array([0, 0, 0]),
                        "sample_probability_norm": np.array([5000, 5000, 0]),
                    },  # overlap 0
                    5: {
                        "sample_probability": np.array([0, 0, 0]),
                        "sample_probability_norm": np.array([2000, 5000, 3000]),
                    },  # overlap 0, 2
                },
                2: {
                    6: {
                        "sample_probability": np.array([0, 0, 0]),
                        "sample_probability_norm": np.array([0, 0, 10000]),
                    },  # no overlap
                    7: {
                        "sample_probability": np.array([0, 0, 0]),
                        "sample_probability_norm": np.array([5000, 0, 5000]),
                    },  # overlap 0
                    8: {
                        "sample_probability": np.array([0, 0, 0]),
                        "sample_probability_norm": np.array([2000, 3000, 5000]),
                    },  # overlap 0, 1
                },
            },
        )
    ]
    # Store in HDF5 cache
    mod._store_data_in_cache(class_overlap_mod_response, indices=mod.get_caching_indices())
    mod_overlap = OverlapTaggingModule(DatasetSplitName.train, simple_text_config)
    res = mod_overlap.compute_on_dataset_split()
    assert len(res) == 9, "Overlap result is incorrect length"
    # TODO: Add some actual tests here on overlap smart tag values!!!

    mod_overlap_eval = OverlapTaggingModule(
        dataset_split_name=DatasetSplitName.eval, config=simple_text_config
    )
    res_eval = mod_overlap_eval.compute_on_dataset_split()
    assert (
        len(res_eval) == mod_overlap_eval.get_dataset_split_manager().num_rows
    ), "OverlapTaggingModule should return list of correct length for eval split"
    assert res_eval[0] == [], "OverlapTaggingModule should return list of empty lists"


def test_overlap_save_to_dataset(simple_text_config, dask_client, monkeypatch):
    simple_table_key = get_table_key(simple_text_config)
    res_overlap_tagging = [TaggingResponse(tags={}, adds={"overlapped_classes": [0, 1, 2]})] * 42
    mod_overlap = OverlapTaggingModule(DatasetSplitName.train, simple_text_config)
    dm = mod_overlap.get_dataset_split_manager()
    mod_overlap._save_result(res_overlap_tagging, dm)
    assert "overlapped_classes" in dm.get_dataset_split(simple_table_key).column_names


def test_overlap_eval_skip_quietly(simple_text_config, dask_client, monkeypatch):
    simple_table_key = get_table_key(simple_text_config)
    res_overlap_tagging = []
    mod_overlap = OverlapTaggingModule(DatasetSplitName.eval, simple_text_config)
    dm = mod_overlap.get_dataset_split_manager()
    # Should only save for train split
    mod_overlap._save_result(res_overlap_tagging, dm)
    assert "overlapped_classes" not in dm.get_dataset_split(simple_table_key).column_names
