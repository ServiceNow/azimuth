# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from functools import reduce
from typing import List, Tuple, cast

from datasets import Dataset

from azimuth.config import ModelContractConfig
from azimuth.modules.base_classes import IndexableModule
from azimuth.modules.model_contract_task_mapping import model_contract_task_mapping
from azimuth.modules.task_execution import get_task_result
from azimuth.types import DatasetColumn, ModuleOptions, SupportedMethod
from azimuth.types.task import SaliencyResponse
from azimuth.types.word_analysis import TokensToWordsResponse


class TokensToWordsModule(IndexableModule[ModelContractConfig]):
    """Returns the words in an utterance with their saliency values."""

    allowed_mod_options = IndexableModule.allowed_mod_options
    required_mod_options = {"pipeline_index"}

    def get_tokens_saliencies(self, indices: List[int]) -> List[SaliencyResponse]:
        """
        Get saliency values and tokens for the provided indices.

        Args:
            indices: Indices in the dataset_split for which to get saliency values and tokens.

        Returns:
            Saliency values for each token. Will be 0 if saliency maps are not available.

        """
        saliency_task = model_contract_task_mapping(
            self.dataset_split_name,
            self.config,
            ModuleOptions(
                model_contract_method_name=SupportedMethod.Saliency,
                pipeline_index=self.mod_options.pipeline_index,
                indices=indices,
            ),
        )
        result = get_task_result(task_module=saliency_task, result_type=List[SaliencyResponse])
        return result

    def compute(self, batch: Dataset) -> List[TokensToWordsResponse]:  # type: ignore
        """Get words and their saliencies for a given set of indices.

        Args:
            batch: Batch

        Returns:
            Words and their Saliencies for utterances associated to indices.

        """
        TokenSaliency = Tuple[str, float]

        def make_words(results: List[TokenSaliency], x: TokenSaliency) -> List[TokenSaliency]:
            tok, sal = x
            if tok.startswith("##"):
                if len(results) == 0:
                    raise ValueError("First token is not a word.")
                (l_tok, l_sal), rest = results[-1], results[:-1]
                l_tok = l_tok + tok.lstrip("##")
                l_sal = l_sal + sal
                return rest + [(l_tok, l_sal)]
            else:
                return results + [x]

        tokens_saliencies = self.get_tokens_saliencies(
            cast(List[int], batch[DatasetColumn.row_idx])
        )
        get_words_responses: List[TokensToWordsResponse] = []
        for idx, record in enumerate(tokens_saliencies):
            tokens = record.tokens
            saliencies = record.saliency

            words_saliencies: List[TokenSaliency] = reduce(make_words, zip(tokens, saliencies), [])
            if words_saliencies:
                all_words, saliency_per_word = list(map(list, zip(*words_saliencies)))
            else:
                all_words, saliency_per_word = [], []
            get_words_responses.append(
                TokensToWordsResponse(words=all_words, saliency=saliency_per_word)
            )

        return get_words_responses
