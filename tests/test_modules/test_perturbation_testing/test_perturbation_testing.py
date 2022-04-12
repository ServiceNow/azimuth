# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from azimuth.modules.perturbation_testing.perturbation_testing import (
    PerturbationTestingModule,
)
from azimuth.types.general.dataset import DatasetColumn, DatasetSplitName
from azimuth.types.general.module_options import ModuleOptions
from azimuth.types.perturbation_testing import (
    PerturbationTestClass,
    PerturbationTestFailureReason,
    PerturbationTestFamily,
    PerturbationTestName,
    PerturbationTestType,
    PerturbationType,
    PerturbedUtteranceResult,
)
from azimuth.types.tag import SmartTag
from azimuth.utils.ml.perturbation_functions import (
    get_utterances_diff,
    remove_or_add_contractions,
    typo,
)
from azimuth.utils.ml.perturbation_test import PerturbationTest


def test_perturbation_testing(simple_text_config):
    mod = PerturbationTestingModule(
        DatasetSplitName.eval,
        config=simple_text_config,
        mod_options=ModuleOptions(pipeline_index=0, indices=[0, 1]),
    )
    res = mod.compute_on_dataset_split()
    assert len(res) == 2

    # filter by punctuation perturbation tests.
    punctuation_test_results = [
        list(
            filter(lambda test_res: test_res.family == PerturbationTestFamily.punctuation, utt_res)
        )
        for utt_res in res
    ]
    assert len(punctuation_test_results[0]) > 0

    # Check that different punctuation tests create different confidences.
    assert all(
        not any(utt_res_punctuation[0].confidence == v.confidence for v in utt_res_punctuation[1:])
        for utt_res_punctuation in punctuation_test_results
    )

    # filter tests that failed because of the prediction confidence threshold.

    failed_threshold_test_results = [
        list(
            filter(
                lambda test_res: test_res.failure_reason
                == PerturbationTestFailureReason.PredConfThreshold,
                utt_res,
            )
        )
        for utt_res in res
    ]
    assert len(failed_threshold_test_results) > 0
    assert all(
        all(v.confidence_delta > 0.005 for v in utt_res_failed)
        for utt_res_failed in failed_threshold_test_results
    )

    num_suf_neutrals = len(mod.config.behavioral_testing.neutral_token.suffix_list)
    num_pre_neutrals = len(mod.config.behavioral_testing.neutral_token.prefix_list)
    # Assert the number of generated test are correct
    # 7 is for 4 punctuation tests + 3 typo tests.
    # >= is because contraction tests don't always apply.
    assert len(res[0]) >= num_suf_neutrals + num_pre_neutrals + 7


def test_typo_deterministic(simple_text_config):
    mod = PerturbationTestingModule(
        DatasetSplitName.eval,
        config=simple_text_config,
        mod_options=ModuleOptions(pipeline_index=0),
    )
    typo_test_case = PerturbationTest(
        name=PerturbationTestName.typos,
        family=PerturbationTestFamily.fuzzy_matching,
        test_fn=typo,
        test_type=PerturbationTestType.invariant,
        test_class=PerturbationTestClass.robustness,
        conf_delta_threshold=mod.config.behavioral_testing.fuzzy_matching.threshold,
        expect_flip=False,
    )

    batch_to_try = {
        "utterance": ["Let's see if it is deterministic!"],
        "label": [1],
        DatasetColumn.row_idx: [0],
    }

    first_try = mod.get_test_results(
        typo_test_case,
        batch=batch_to_try,
    )

    # we have 3 typo tests
    assert len(first_try[0]) == 3

    second_try = mod.get_test_results(
        typo_test_case,
        batch=batch_to_try,
    )
    assert all(
        [
            first.perturbed_utterance[0] == sec.perturbed_utterance[0]
            for first, sec in zip(first_try[0], second_try[0])
        ]
    )


def test_typo_hyphens(simple_text_config):
    original = "what's the total I've spent on shoes this month?"
    perturbed_utterance_details = typo(original, simple_text_config)
    for perturbed_utterance_detail in perturbed_utterance_details:
        assert (
            len(perturbed_utterance_detail.perturbations)
            == simple_text_config.behavioral_testing.typo.nb_typos_per_utterance
            and "'" not in perturbed_utterance_detail.perturbations
        )


def test_if_failed(simple_text_config):
    FAILED = True
    tests = [
        # Same pred, test not failed
        ((1, 0.9), (1, 0.9), 0.01, False, (not FAILED, PerturbationTestFailureReason.NA, 0.00)),
        # Confidence diff is not big enough.
        ((1, 0.9), (1, 0.89), 0.01, False, (not FAILED, PerturbationTestFailureReason.NA, 0.01)),
        # Difference pred
        ((1, 0.9), (0, 0.9), 0.01, False, (FAILED, PerturbationTestFailureReason.PredClass, None)),
        # Change in confidence is too large
        (
            (1, 0.9),
            (1, 0.6888),
            0.01,
            False,
            (FAILED, PerturbationTestFailureReason.PredConfThreshold, 0.2112),
        ),
        # Same pred, expected to flip
        ((1, 0.9), (1, 0.9), 0.01, True, (FAILED, PerturbationTestFailureReason.PredClass, None)),
    ]

    for test, original, threshold, expect_flip, should_fail in tests:
        test_case = PerturbationTest(
            name=PerturbationTestName.ending_period,
            family=PerturbationTestFamily.punctuation,
            test_fn=lambda x: x,
            test_class=PerturbationTestClass.robustness,
            test_type=PerturbationTestType.invariant,
            conf_delta_threshold=threshold,
            expect_flip=expect_flip,
        )
        assert test_case.is_failed(test, original) == should_fail


def test_get_modifications():
    utterance = "hehe, I should write this test."

    new_sents = ["hehe, 1 should wrile this test.", "hehe,I should writ this test"]

    modifs = [get_utterances_diff(utterance, new_sen) for new_sen in new_sents]

    assert set(modifs[0]) == {"1", "wrile"}
    assert set(modifs[1]) == {"hehe,I", "writ", "test"}


def test_contractions(simple_text_config):
    utterance = "I shouldn't write this test, but I am doing it anyway."
    results = remove_or_add_contractions(utterance, simple_text_config)

    assert (
        results[0].perturbed_utterance == "I should not write this test, but I am doing it anyway."
    )
    assert "should" in results[0].perturbations and "not" in results[0].perturbations

    assert results[1].perturbed_utterance == "I shouldn't write this test, but I'm doing it anyway."
    assert "I'm" in results[1].perturbations


def test_save(simple_text_config, simple_table_key):
    mod = PerturbationTestingModule(
        DatasetSplitName.eval,
        config=simple_text_config,
        mod_options=ModuleOptions(pipeline_index=0),
    )
    dm = mod.get_dataset_split_manager()
    tests = [PerturbationTestName.ending_period, PerturbationTestName.typos]
    test_families = [PerturbationTestFamily.punctuation, PerturbationTestFamily.fuzzy_matching]

    res = [
        [
            PerturbedUtteranceResult(
                name=t,
                perturbed_utterance="hello",
                prediction=idx % 2,
                confidence=0.5,
                confidence_delta=0.1,
                perturbations=[],
                perturbation_type=PerturbationType.Insertion,
                failure_reason=PerturbationTestFailureReason.PredClass,
                failed=((test_id + idx) % 2) == 0,
                description="",
                family=tf,
            )
            for test_id, (t, tf) in enumerate(zip(tests, test_families))
        ]
        for idx in range(dm.num_rows)
    ]
    mod.save_result(res, dm)
    assert any(dm.get_dataset_split(simple_table_key)[SmartTag.failed_fuzzy_matching])
    assert any(dm.get_dataset_split(simple_table_key)[SmartTag.failed_punctuation])
