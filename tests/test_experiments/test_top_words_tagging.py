# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import Dict, List

import datasets
import numpy as np
import pandas as pd

from azimuth.types import DatasetColumn, DatasetSplitName
from azimuth.types.word_analysis import (
    TokensToWordsResponse,
    TopWordsImportanceCriteria,
    TopWordsResponse,
    TopWordsResult,
)


def mock_top_words(label):
    # Simulating that the word hell and cookie is important no matter the class.
    return [
        TopWordsResponse(
            all=[
                TopWordsResult(word="hell", count=2),
                TopWordsResult(word="cookies", count=2),
            ],
            right=[],
            errors=[],
            importance_criteria=TopWordsImportanceCriteria.frequent,
        )
    ]


def mock_new_overlapping():
    return {0: ["hell"], 1: ["hell"]}, {0: ["sugar"], 1: ["sugar"]}


def top_words_dataset():
    data_eval = {
        DatasetColumn.row_idx: [0, 1, 2, 3],
        "utterance": [
            "detect files.",
            "this is hell. It is terribly horrible for me to write this test but I am having fun.",
            "I am looking for",
            "sugar and cookies!",
        ],
        "label": [0, 1, 0, 1],
    }

    data_train = {
        DatasetColumn.idx: [
            0,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19,
            20,
        ],
        "utterance": [
            "cookies",
            "sugar and cookies!",
            "I love cookies",
            "I love cookies",
            "I love cookies",
            "I love cookies",
            "I love cookies",
            "I love cookies",
            "I love cookies",
            "I love cookies",
            "I love cookies",
            "I love cookies",
            "I love cookies",
            "I love cookies",
            "I love cookies",
            "I love cookies",
            "I love cookies",
            "I love cookies",
            "I love cookies",
            "I love cookies",
            "I love cookies",
        ],
        "label": [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    }

    train_ds = datasets.Dataset.from_pandas(
        df=pd.DataFrame.from_dict(data_train),
        split=datasets.Split.TRAIN,
        features=datasets.Features(
            utterance=datasets.Value("string"),
            label=datasets.ClassLabel(num_classes=2, names=["POS", "NEG"]),
        ),
    )
    eval_ds = datasets.Dataset.from_pandas(
        df=pd.DataFrame.from_dict(data_eval),
        split=datasets.Split.TEST,
        features=datasets.Features(
            utterance=datasets.Value("string"),
            label=datasets.ClassLabel(num_classes=2, names=["POS", "NEG"]),
        ),
    )

    return datasets.DatasetDict({"eval": eval_ds, "train": train_ds})


def mock_get_words() -> Dict[DatasetSplitName, List[TokensToWordsResponse]]:
    def get_words_response(
        list_of_utterances: List[List[str]],
    ) -> List[TokensToWordsResponse]:
        words_saliencies = []
        for utterance_per_word in list_of_utterances:
            words_saliencies.append(
                TokensToWordsResponse(
                    words=utterance_per_word,
                    saliency=np.random.rand(len(utterance_per_word)).tolist(),
                )
            )
        return words_saliencies

    words_saliencies_eval = get_words_response(
        [
            ["[CLS]", "detect", "files", ".", "[SEP]"],
            [
                "[CLS]",
                "this",
                "is",
                "hell",
                ".",
                "it",
                "is",
                "terribly",
                "horrible",
                "for",
                "me",
                "to",
                "write",
                "this",
                "eval",
                "but",
                "i",
                "am",
                "having",
                "fun",
                ".",
                "[SEP]",
            ],
            ["[" "CLS]", "i", "am", "looking", "for", "[SEP]"],
            ["[CLS]", "sugar", "and", "cookies", "!", "[SEP]"],
        ]
    )
    words_saliencies_train = get_words_response(
        [["[CLS]", "cookies", "[SEP]"], ["[CLS]", "sugar", "and", "cookies", "!", "[SEP]"]]
        + 19 * [["[" "CLS]", "i", "love", "cookies", "[SEP]"]]
    )

    return {
        DatasetSplitName.eval: words_saliencies_eval,
        DatasetSplitName.train: words_saliencies_train,
    }
