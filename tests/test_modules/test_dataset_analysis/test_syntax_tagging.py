# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from azimuth.modules.dataset_analysis.syntax_tagging import SyntaxTaggingModule
from azimuth.types import DatasetColumn, DatasetSplitName
from azimuth.types.tag import SmartTag


def test_syntax_tagging(simple_text_config):
    mod = SyntaxTaggingModule(
        DatasetSplitName.eval,
        simple_text_config,
    )

    assert mod is not None
    batch = {
        DatasetColumn.idx: [0, 1, 2, 3],
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
    assert json_output[0].tags[SmartTag.short] and json_output[0].tags[SmartTag.no_subj] is True
    assert not all(
        v for k, v in json_output[0].tags.items() if k not in [SmartTag.short, SmartTag.no_subj]
    )

    assert json_output[1].tags[SmartTag.multi_sent] is True
    assert not all(v for k, v in json_output[1].tags.items() if k is not SmartTag.multi_sent)

    assert json_output[2].tags[SmartTag.no_obj] is True
    assert not all(v for k, v in json_output[2].tags.items() if k is not SmartTag.no_obj)

    assert json_output[3].tags[SmartTag.no_verb] is True
    assert not all(v for k, v in json_output[3].tags.items() if k is not SmartTag.no_verb)

    json_output = mod.compute_on_dataset_split()
    ds = mod.get_dataset_split()
    assert len(json_output) == len(ds)
