# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
import itertools
from typing import Dict, List, cast

import spacy
from datasets import Dataset
from spacy.lang.en import English

from azimuth.config import SyntaxConfig, SyntaxOptions
from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.modules.base_classes import DatasetResultModule
from azimuth.types import DatasetColumn, ModuleResponse
from azimuth.types.tag import (
    SMART_TAGS_FAMILY_MAPPING,
    SmartTag,
    SmartTagFamily,
    TaggingResponse,
)
from azimuth.utils.validation import assert_not_none


class SyntaxTaggingModule(DatasetResultModule[SyntaxConfig]):
    """Calculate smart tags related to syntax."""

    # sentencizer
    spacy_pipeline = English()
    spacy_pipeline.add_pipe("sentencizer")

    # part of speech
    subj_tags = ["nsubj", "nsubjpass"]
    obj_tags = ["dobj", "pobj", "dobj"]

    # we use pos_ for verb since for the moment it is more reliable
    verb_tags = ["VERB", "AUX"]
    spacy_pos = spacy.load("en_core_web_sm")

    def compute(self, batch: Dataset) -> List[TaggingResponse]:  # type: ignore
        """Get smart tags for provided indices.

        Args:
            batch: the batch on which we want to calculate the smart tags.

        Returns:
            tags: Newly calculated tags.

        """

        utterances = batch[self.config.columns.text_input]

        # Always use the BERT tokenizer to ensure this feature works regardless of model
        tokenizer = self.artifact_manager.get_tokenizer()
        inputs = tokenizer(utterances)
        batch_tokens = [tokenizer.convert_ids_to_tokens(tokens) for tokens in inputs["input_ids"]]
        batch_tokens = [
            [tok for tok in batch_token if tok not in [tokenizer.cls_token, tokenizer.sep_token]]
            for batch_token in batch_tokens
        ]

        records: List[TaggingResponse] = []

        for tokens, utterance in zip(batch_tokens, utterances):
            tag: Dict[SmartTag, bool] = {
                smart_tag: False
                for family in [SmartTagFamily.extreme_length, SmartTagFamily.partial_syntax]
                for smart_tag in SMART_TAGS_FAMILY_MAPPING[family]
            }
            adds = {}
            syntax_options: SyntaxOptions = assert_not_none(self.config.syntax)

            do = self.spacy_pipeline(utterance)
            adds[DatasetColumn.token_count] = len(tokens)

            if len(list(do.sents)) > 1:
                tag[SmartTag.multi_sent] = True
                # if an utterance has more than one sentence, no other tags are added.
            else:
                if len(tokens) >= syntax_options.long_sentence_min_token:
                    tag[SmartTag.long] = True
                if len(tokens) <= syntax_options.short_sentence_max_token:
                    tag[SmartTag.short] = True

                tokens_doc = self.spacy_pos(utterance)
                sub_toks = [tok for tok in tokens_doc if (tok.dep_ in self.subj_tags)]
                obj_toks = [tok for tok in tokens_doc if (tok.dep_ in self.obj_tags)]
                vrb_toks = [tok for tok in tokens_doc if (tok.pos_ in self.verb_tags)]

                if len(sub_toks) == 0:
                    tag[SmartTag.no_subj] = True
                if len(obj_toks) == 0:
                    tag[SmartTag.no_obj] = True
                if len(vrb_toks) == 0:
                    tag[SmartTag.no_verb] = True

            records.append(TaggingResponse(tags=tag, adds=adds))
        return records

    def _save_result(self, res: List[ModuleResponse], dm: DatasetSplitManager):
        """Save tags in a DatasetSplitManager.

        Args:
            res: Results from `compute_on_dataset_split`.
            dm: the dataset_split manager used to get `res`.

        """
        res_cast = cast(List[TaggingResponse], res)
        dm.add_tags(dict(zip(itertools.count(), (r.tags for r in res_cast))))
        dm.add_column(
            key=DatasetColumn.token_count,
            features=[r.adds[DatasetColumn.token_count] for r in res_cast],
        )
