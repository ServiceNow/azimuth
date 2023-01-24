# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import numpy as np

from azimuth.modules.word_analysis.top_words import TopWordsModule
from azimuth.types import DatasetSplitName, ModuleOptions
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


def test_top_words_with_saliency(simple_text_config, apply_mocked_startup_task, monkeypatch):
    mod = TopWordsModule(
        dataset_split_name=DatasetSplitName.eval,
        config=simple_text_config,
        mod_options=ModuleOptions(top_x=4, pipeline_index=0),
    )
    monkeypatch.setattr(mod, "get_words_saliencies", fake_get_words_saliencies)
    assert mod is not None
    [json_output] = mod.compute_on_dataset_split()
    assert len(json_output.all) > 0
    assert len(json_output.right) > 0 or len(json_output.errors) > 0


def test_top_words_without_saliency(file_text_config_top1):
    save_predictions(file_text_config_top1)

    mod = TopWordsModule(
        dataset_split_name=DatasetSplitName.eval,
        config=file_text_config_top1,
        mod_options=ModuleOptions(top_x=16, pipeline_index=0),
    )
    [json_output] = mod.compute_on_dataset_split()

    top_word_all = [top_words_result.word for top_words_result in json_output.all]
    top_word_right = [top_words_result.word for top_words_result in json_output.right]
    top_word_errors = [top_words_result.word for top_words_result in json_output.errors]

    assert all(
        word in top_word_all for word in ["phone", "potato", "pizza", "forest", "park", "turning"]
    )
    assert all(word not in top_word_all for word in ["to", "the", "not", "with", "on"])
    assert all(word in top_word_right for word in ["phone", "potato", "pizza", "forest"])
    assert all(word not in top_word_right for word in ["turning", "park"])
    assert all(word in top_word_errors for word in ["phone", "turning", "park"])
    assert all(word not in top_word_errors for word in ["potato", "pizza", "forest"])
