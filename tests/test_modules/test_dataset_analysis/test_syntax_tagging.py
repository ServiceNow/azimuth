# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from itertools import zip_longest

from azimuth.modules.dataset_analysis.syntax_tagging import SyntaxTaggingModule
from azimuth.types import DatasetColumn, DatasetSplitName
from azimuth.types.tag import SmartTag


def verify_syntax_results(json_output, smart_tags_per_idx, token_count_per_idx):
    for res, smart_tags, token_count in zip_longest(
        json_output, smart_tags_per_idx, token_count_per_idx
    ):
        assert list(res.tags.values()) == [k in smart_tags for k in res.tags.keys()]
        assert res.adds[DatasetColumn.word_count] == token_count


def test_syntax_tagging(tiny_text_config):
    batch = {
        "utterance": [
            "detect files.",
            "this is hell. It is terribly horrible for me to write this test but I am having fun.",
            "I am looking for",
            "sugar and cookies!",
        ],
        "label": [0, 1, 0, 1],
    }

    mod = SyntaxTaggingModule(
        DatasetSplitName.eval,
        tiny_text_config,
    )
    json_output = mod.compute(batch)

    assert len(json_output) == 4

    smart_tags_per_idx = [
        [SmartTag.short, SmartTag.no_subj],
        [SmartTag.multi_sent, SmartTag.long],
        [SmartTag.no_obj],
        [SmartTag.no_obj, SmartTag.no_verb, SmartTag.no_subj, SmartTag.short],
    ]
    token_count_per_idx = [2, 18, 4, 3]

    verify_syntax_results(json_output, smart_tags_per_idx, token_count_per_idx)

    # Edit config values
    tiny_text_config_edited = tiny_text_config.copy(deep=True)
    tiny_text_config_edited.syntax.short_utterance_max_word = 4
    tiny_text_config_edited.syntax.long_utterance_min_word = 3

    mod = SyntaxTaggingModule(
        DatasetSplitName.eval,
        tiny_text_config_edited,
    )
    json_output = mod.compute(batch)

    # Tags should change for utterances below, based on the new config values
    for idx in [2, 3]:
        assert json_output[idx].tags[SmartTag.long] and json_output[idx].tags[SmartTag.short]

    json_output_all = mod.compute_on_dataset_split()
    ds = mod.get_dataset_split()
    assert len(json_output_all) == len(ds)


def test_syntax_tagging_french(simple_text_config_french):
    batch = {
        "utterance": [
            "adore les biscuits!",
            "c'est terrible. C'est horrible pour moi d'écrire ce test, mais je m'amuse bien.",
            f"J{chr(8217)}aimerais aller",  # Single quote; sm model struggled with j'aimerais subj
            "le sucre et les biscuits!",  # As currently implemented, no subject or object
            "Indiquez-moi l'état de mes demandes",  # First word (a) capitalized and (b) verb
        ],
        "label": [0, 1, 0, 1, 0],
    }

    mod = SyntaxTaggingModule(
        DatasetSplitName.eval,
        simple_text_config_french,
    )
    json_output = mod.compute(batch)

    assert len(json_output) == 5

    smart_tags_per_idx = [
        [SmartTag.short, SmartTag.no_subj],
        [SmartTag.long, SmartTag.multi_sent],
        [SmartTag.short, SmartTag.no_obj],
        [SmartTag.no_obj, SmartTag.no_verb, SmartTag.no_subj],
        [SmartTag.no_subj],
    ]
    token_count_per_idx = [3, 17, 3, 5, 7]

    verify_syntax_results(json_output, smart_tags_per_idx, token_count_per_idx)
