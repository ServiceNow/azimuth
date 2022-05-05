# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import numpy as np

from azimuth.modules.word_analysis.top_words import TopWordsModule
from azimuth.types import DatasetFilters, DatasetSplitName, ModuleOptions
from azimuth.types.word_analysis import TokensToWordsResponse
from tests.utils import save_predictions

ALL_WORDS = [
    "hello",
    ",",
    "my",
    "name",
    "is",
    "fred",
    "[CLS]",
    "the",
    "sky",
    "is",
    "blue",
    ".",
    "[SEP]",
    "i",
    "like",
    "coffee",
]


def fake_get_words_saliencies(indices):
    rng = np.random.RandomState(1338)
    records = []
    for i in indices:
        records.append(
            TokensToWordsResponse(
                saliency=rng.rand(16).tolist(),  # 16 words
                words=ALL_WORDS,
            )
        )
    return records


def test_top_words_with_saliency(
    monkeypatch, simple_text_config, dask_client, apply_mocked_startup_task
):
    mod = TopWordsModule(
        dataset_split_name=DatasetSplitName.eval,
        config=simple_text_config,
        mod_options=ModuleOptions(
            filters=DatasetFilters(labels=[0]), top_x=4, pipeline_index=0  # reduce time
        ),
    )
    monkeypatch.setattr(mod, "get_words_saliencies", fake_get_words_saliencies)
    assert mod is not None
    [json_output] = mod.compute_on_dataset_split()
    assert len(json_output.all) > 0
    assert len(json_output.right) > 0 or len(json_output.errors) > 0


def fake_no_saliency(indices):
    records = []
    for i in indices:
        records.append(
            TokensToWordsResponse(
                saliency=16 * [0],  # 16 words
                words=ALL_WORDS,
            )
        )
    return records


def test_top_words_without_saliency(monkeypatch, file_text_config_top1, dask_client):
    save_predictions(file_text_config_top1)

    mod = TopWordsModule(
        dataset_split_name=DatasetSplitName.eval,
        config=file_text_config_top1,
        mod_options=ModuleOptions(top_x=16, pipeline_index=0),
    )

    monkeypatch.setattr(mod, "get_words_saliencies", fake_no_saliency)
    assert mod is not None
    [json_output] = mod.compute_on_dataset_split()

    top_word_all = [top_words_result.word for top_words_result in json_output.all]

    for word in ["fred", "name", "sky", "blue"]:
        assert word in top_word_all
    for word in ["i", "is", "the", "."]:
        assert word not in top_word_all
