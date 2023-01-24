# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from collections import Counter
from typing import List, Tuple

import numpy as np
import spacy

from azimuth.config import AzimuthConfig
from azimuth.modules.base_classes import FilterableModule
from azimuth.modules.task_execution import get_task_result
from azimuth.modules.word_analysis.tokens_to_words import TokensToWordsModule
from azimuth.types import ModuleOptions
from azimuth.types.word_analysis import (
    TokensToWordsResponse,
    TopWordsImportanceCriteria,
    TopWordsResponse,
    TopWordsResult,
)
from azimuth.utils.dataset_operations import get_predictions_from_ds
from azimuth.utils.project import saliency_available
from azimuth.utils.utterance import clean_utterance

MIN_SALIENCY = 0.01


class TopWordsModule(FilterableModule[AzimuthConfig]):
    """Returns the most important words in terms of their saliency value or frequency."""

    allowed_mod_options = FilterableModule.allowed_mod_options | {
        "top_x",
        "th_importance",
        "force_no_saliency",
    }

    @staticmethod
    def count_words(list_of_words: List[str], top_x: int) -> List[TopWordsResult]:
        """Count the number of words.

        Args:
            list_of_words: List of important words.
            top_x: Number of top words to output.

        Returns:
            Top words and their occurrences.

        """
        count_top_words: List[Tuple[str, int]] = Counter(list_of_words).most_common(top_x)
        wordcount_list: List[TopWordsResult] = (
            [TopWordsResult(word=str(x), count=y) for (x, y) in count_top_words]
            if list_of_words
            else []
        )
        return wordcount_list

    def get_words_saliencies(self, indices: List[int]) -> List[TokensToWordsResponse]:
        """TokensToWordsModule results.

        Args:
            indices: Indices on which to get words and saliencies.

        Returns:
            List of Words and Saliencies per utterance.

        """
        get_words_task = TokensToWordsModule(
            self.dataset_split_name,
            self.config,
            mod_options=ModuleOptions(
                pipeline_index=self.mod_options.pipeline_index, indices=indices
            ),
        )
        result = get_task_result(
            task_module=get_words_task, result_type=List[TokensToWordsResponse]
        )
        return result

    def compute_on_dataset_split(self) -> List[TopWordsResponse]:  # type: ignore
        """
        Compute most important words according to saliency maps, if available, or frequency for the
        filtered dataset_split. It computes the most important words for all according predictions
        (all), for predictions that were predicted right (right) and finally predictions that were
        predicted wrongly (errors).
        """
        importance_criteria = (
            TopWordsImportanceCriteria.salient
            if (saliency_available(self.config) and not self.mod_options.force_no_saliency)
            else TopWordsImportanceCriteria.frequent
        )

        ds = self.get_dataset_split()

        if len(ds) == 0:
            return [
                TopWordsResponse(
                    all=[],
                    right=[],
                    errors=[],
                    importance_criteria=importance_criteria,
                )
            ]

        important_words_per_idx = {}
        if importance_criteria == TopWordsImportanceCriteria.salient:
            words_saliencies = self.get_words_saliencies(self.get_indices())
            tokenizer = self.get_model().tokenizer
            for idx, record in enumerate(words_saliencies):
                # Put everything to lower case and remove cls/sep tokens.
                words, saliencies = zip(
                    *[
                        (word.lower(), saliency_value)
                        for word, saliency_value in zip(record.words, record.saliency)
                        if word not in [tokenizer.cls_token, tokenizer.sep_token]
                    ]
                )
                if words:
                    importance_saliency = max(
                        self.mod_options.th_importance * max(record.saliency), MIN_SALIENCY
                    )
                    important_words_per_idx[idx] = [
                        word
                        for word, _ in filter(
                            lambda s: s[1] > importance_saliency, zip(words, saliencies)
                        )
                    ]
        # If saliency is not available, we proxy important words as any word that is neither
        # punctuation or a stop word.
        else:
            spacy_model = spacy.load(self.config.syntax.spacy_model)
            utterances = ds[self.config.columns.text_input]
            for idx, utterance in enumerate(utterances):
                doc = spacy_model(clean_utterance(utterance))
                important_words_per_idx[idx] = [
                    token.text for token in doc if not token.is_stop and not token.is_punct
                ]

        is_error = np.array(
            get_predictions_from_ds(ds, self.mod_options.without_postprocessing)
        ) != np.array(ds[self.config.columns.label])

        important_words_all = [word for words in important_words_per_idx.values() for word in words]
        important_words_right = [
            word
            for idx, words in important_words_per_idx.items()
            for word in words
            if not is_error[idx]
        ]
        important_words_errors = [
            word
            for idx, words in important_words_per_idx.items()
            for word in words
            if is_error[idx]
        ]

        top_x = self.mod_options.top_x

        return [
            TopWordsResponse(
                all=self.count_words(important_words_all, top_x),
                right=self.count_words(important_words_right, top_x),
                errors=self.count_words(important_words_errors, top_x),
                importance_criteria=importance_criteria,
            )
        ]
