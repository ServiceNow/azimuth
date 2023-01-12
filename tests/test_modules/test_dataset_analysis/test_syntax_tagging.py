# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from azimuth.modules.dataset_analysis.syntax_tagging import SyntaxTaggingModule
from azimuth.types import DatasetSplitName
from azimuth.types.tag import SmartTag


def test_syntax_tagging(tiny_text_config):
    mod = SyntaxTaggingModule(
        DatasetSplitName.eval,
        tiny_text_config,
    )

    batch = {
        "utterance": [
            "detect files.",
            "this is hell. It is terribly horrible for me to write this test but I am having fun.",
            "I am looking for",
            "sugar and cookies!",
        ],
        "label": [0, 1, 0, 1],
    }
    json_output = mod.compute(batch)
    assert len(json_output) == 4
    assert json_output[0].tags[SmartTag.short] and json_output[0].tags[SmartTag.no_subj]
    assert not all(
        v for k, v in json_output[0].tags.items() if k not in [SmartTag.short, SmartTag.no_subj]
    )

    assert json_output[1].tags[SmartTag.multi_sent]
    assert not all(v for k, v in json_output[1].tags.items() if k is not SmartTag.multi_sent)

    assert json_output[2].tags[SmartTag.no_obj]
    assert not all(v for k, v in json_output[2].tags.items() if k is not SmartTag.no_obj)

    assert json_output[3].tags[SmartTag.no_verb]
    assert not all(v for k, v in json_output[3].tags.items() if k is not SmartTag.no_verb)

    # Edit config values
    tiny_text_config_2 = tiny_text_config.copy(deep=True)
    tiny_text_config_2.syntax.short_sentence_max_word = 2
    tiny_text_config_2.syntax.long_sentence_min_word = 3

    mod_2 = SyntaxTaggingModule(
        DatasetSplitName.eval,
        tiny_text_config_2,
    )

    json_output_2 = mod_2.compute(batch)
    # Tags should change for utterances below, based on the new config values
    assert json_output_2[0].tags[SmartTag.short] and not json_output_2[0].tags[SmartTag.long]
    assert json_output_2[2].tags[SmartTag.long]
    assert json_output_2[3].tags[SmartTag.long]

    json_output_all = mod.compute_on_dataset_split()
    ds = mod.get_dataset_split()
    assert len(json_output_all) == len(ds)


def test_syntax_tagging_french(simple_text_config_french):
    mod = SyntaxTaggingModule(
        DatasetSplitName.eval,
        simple_text_config_french,
    )

    assert mod is not None
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
    json_output = mod.compute(batch)
    assert len(json_output) == 5

    assert json_output[0].tags[SmartTag.no_subj]
    assert not any([json_output[0].tags[SmartTag.no_obj], json_output[0].tags[SmartTag.no_verb]])

    assert not json_output[1].tags[SmartTag.no_subj]
    assert not json_output[1].tags[SmartTag.no_obj]
    assert not json_output[1].tags[SmartTag.no_verb]

    assert not any([json_output[2].tags[SmartTag.no_subj], json_output[2].tags[SmartTag.no_verb]])
    assert json_output[2].tags[SmartTag.no_obj]

    assert json_output[3].tags[SmartTag.no_subj]
    assert json_output[3].tags[SmartTag.no_obj]
    assert json_output[3].tags[SmartTag.no_verb]

    assert not json_output[4].tags[SmartTag.no_verb]

    # Sentencizer is from English model but should work for French
    assert not any(json_output[i].tags[SmartTag.multi_sent] for i in [0, 2, 3])
    assert json_output[1].tags[SmartTag.multi_sent]
