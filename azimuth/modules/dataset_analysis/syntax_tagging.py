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
    Tag,
    TaggingResponse,
)
from azimuth.utils.utterance import clean_utterance
from azimuth.utils.validation import assert_not_none


class SyntaxTaggingModule(DatasetResultModule[SyntaxConfig]):
    """Calculate smart tags related to syntax."""

    spacy_sentencizer_en = English()
    spacy_sentencizer_en.add_pipe("sentencizer")
    # we use pos_ for verb since it is simpler and more reliable than dep_
    verb_tags = ["VERB", "AUX"]

    def compute(self, batch: Dataset) -> List[TaggingResponse]:  # type: ignore
        """Get smart tags for provided indices.

        Args:
            batch: the batch on which we want to calculate the smart tags.

        Returns:
            tags: Newly calculated tags.

        """
        syntax_options: SyntaxOptions = assert_not_none(self.config.syntax)
        spacy_model = spacy.load(syntax_options.spacy_model)

        utterances = batch[self.config.columns.text_input]
        records: List[TaggingResponse] = []

        for utterance in utterances:
            tag: Dict[Tag, bool] = {
                smart_tag: False
                for family in [SmartTagFamily.extreme_length, SmartTagFamily.partial_syntax]
                for smart_tag in SMART_TAGS_FAMILY_MAPPING[family]
            }

            doc = spacy_model(clean_utterance(utterance))
            # Remove punctuation for word count and smart tags
            tokens = [token.text for token in doc if not token.is_punct]

            # Some issues occur with other languages such as french if using doc.sents directly.
            # Hence, we use an English sentencizer that seems to work better for similar languages.
            doc_sentencizer_en = self.spacy_sentencizer_en(clean_utterance(utterance))
            sentence_count = len(list(doc_sentencizer_en.sents))

            if sentence_count > 1:
                # if an utterance has more than one sentence, no other tags are added.
                tag[SmartTag.multi_sent] = True
            else:
                if len(tokens) >= syntax_options.long_sentence_min_word:
                    tag[SmartTag.long] = True
                if len(tokens) <= syntax_options.short_sentence_max_word:
                    tag[SmartTag.short] = True

                sub_toks = [tok for tok in doc if (tok.dep_ in syntax_options.subj_tags)]
                obj_toks = [tok for tok in doc if (tok.dep_ in syntax_options.obj_tags)]
                vrb_toks = [tok for tok in doc if (tok.pos_ in self.verb_tags)]
                if not sub_toks:
                    tag[SmartTag.no_subj] = True
                if not obj_toks:
                    tag[SmartTag.no_obj] = True
                if not vrb_toks:
                    tag[SmartTag.no_verb] = True

            adds = {DatasetColumn.word_count: len(tokens)}
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
            key=DatasetColumn.word_count,
            features=[r.adds[DatasetColumn.word_count] for r in res_cast],
        )
