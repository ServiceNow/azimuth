# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from azimuth.modules.perturbation_testing import (
    PerturbationTestingMergedModule,
    PerturbationTestingModule,
    PerturbationTestingSummaryModule,
)
from azimuth.types import DatasetSplitName, ModuleOptions
from tests.utils import get_tiny_text_config_one_ds_name


def test_perturbation_testing_summary(tiny_text_config):
    mod = PerturbationTestingMergedModule(
        dataset_split_name=DatasetSplitName.all,
        config=tiny_text_config,
        mod_options=ModuleOptions(pipeline_index=0),
    )
    [res] = mod.compute_on_dataset_split()
    assert 0 <= res.eval_failure_rate <= 1.0
    assert 0 <= res.train_failure_rate <= 1.0

    mod_sum = PerturbationTestingSummaryModule(
        dataset_split_name=DatasetSplitName.all,
        config=tiny_text_config,
        mod_options=ModuleOptions(pipeline_index=0),
    )

    res = mod_sum.compute_on_dataset_split()[0].all_tests_summary

    # Check that all perturbation tests are included in the table (except contractions which is not
    # always triggered)
    perturb_testing = PerturbationTestingModule(
        dataset_split_name=DatasetSplitName.eval,
        config=tiny_text_config,
        mod_options=ModuleOptions(pipeline_index=0),
    )
    for test in perturb_testing.perturbation_tests:
        if test.name != "Contractions":
            assert any(test.name in r.name for r in res)


def test_perturbation_testing_summary_one_ds(tiny_text_config_one_ds):
    mod = PerturbationTestingMergedModule(
        dataset_split_name=DatasetSplitName.all,
        config=tiny_text_config_one_ds,
        mod_options=ModuleOptions(pipeline_index=0),
    )
    [res] = mod.compute_on_dataset_split()
    ds_name, other_ds_name = get_tiny_text_config_one_ds_name(tiny_text_config_one_ds)
    assert (
        getattr(res, f"{ds_name}_failure_rate") >= 0.0
        and getattr(res, f"{other_ds_name}_failure_rate") == 0.0
    )

    mod_sum = PerturbationTestingSummaryModule(
        dataset_split_name=DatasetSplitName.all,
        config=tiny_text_config_one_ds,
        mod_options=ModuleOptions(pipeline_index=0),
    )

    res = mod_sum.compute_on_dataset_split()[0]
    assert all(getattr(t, f"{other_ds_name}_count") == 0 for t in res.all_tests_summary)
