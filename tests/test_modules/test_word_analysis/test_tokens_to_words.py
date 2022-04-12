# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import numpy as np

from azimuth.modules.word_analysis.tokens_to_words import TokensToWordsModule
from azimuth.types.general.dataset import DatasetSplitName
from azimuth.types.general.module_options import ModuleOptions
from azimuth.types.task import SaliencyResponse


def fake_saliency_record(indices):
    all_tokens = [
        "hel",
        "##lo",
        ",",
        "my",
        "na",
        "##me",
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
        "cof",
        "##fee",
    ]
    rng = np.random.RandomState(1338)
    records = []
    for i in indices:
        records.append(
            SaliencyResponse(saliency=rng.rand(19).tolist(), tokens=all_tokens)  # 19 tokens
        )
    return records


def test_get_words(monkeypatch, simple_text_config, dask_client, apply_mocked_startup_task):
    mod = TokensToWordsModule(
        dataset_split_name=DatasetSplitName.eval,
        config=simple_text_config,
        mod_options=ModuleOptions(indices=[0]),
    )
    monkeypatch.setattr(mod, "get_tokens_saliencies", fake_saliency_record)
    assert mod is not None
    json_output = mod.compute_on_dataset_split()

    [record] = fake_saliency_record(indices=[0])  # Get mocked saliency values per token.
    hello_saliency = record.saliency[0] + record.saliency[1]  # Saliency associated to hello tokens.
    assert json_output[0].words[0] == "hello"  # Assert TokensToWordsModule concatenates hello.
    # Assert TokensToWordsModule sums saliency values of tokens.
    assert np.isclose(hello_saliency, json_output[0].saliency[0])


def test_top_words_get_tokens_saliencies(simple_text_config, dask_client):
    mod = TokensToWordsModule(
        DatasetSplitName.eval,
        simple_text_config,
        mod_options=ModuleOptions(pipeline_index=0, indices=[1, 2]),
    )
    rec = mod.get_tokens_saliencies([1, 2])
    assert len(rec) == 2
