# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import numpy as np

from azimuth.modules.model_contracts.hf_text_classification import (
    HFTextClassificationModule,
)
from azimuth.types.general.dataset import DatasetSplitName
from azimuth.types.general.module_options import ModuleOptions
from azimuth.types.general.modules import SupportedMethod
from azimuth.utils.ml.mc_dropout import MCDropout


def test_mc_dropout_context(simple_text_config):
    mod = HFTextClassificationModule(
        config=simple_text_config,
        dataset_split_name=DatasetSplitName.eval,
        mod_options=ModuleOptions(
            model_contract_method_name=SupportedMethod.Predictions, pipeline_index=0
        ),
    )
    model = mod.get_model()
    model.model.eval()
    # Get a batch
    batch = mod.get_dataset_split()[[1, 2, 3]]

    # Model is deterministic.
    preds = [[[r["score"] for r in res] for res in model(batch["utterance"])] for _ in range(10)]
    assert all(np.allclose(preds[0], p) for p in preds)

    with MCDropout(model.model):
        # The model is now not deterministic.
        preds = [
            [[r["score"] for r in res] for res in model(batch["utterance"])] for _ in range(10)
        ]
        assert not all(np.allclose(preds[0], p) for p in preds)

    # When out of the MCDropout context, the model is deterministic again.
    preds = [[[r["score"] for r in res] for res in model(batch["utterance"])] for _ in range(10)]
    assert all(np.allclose(preds[0], p) for p in preds)
