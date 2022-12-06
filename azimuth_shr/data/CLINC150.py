# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import json
from pathlib import Path

import datasets

_DESCRIPTION = """\
 Subset of CLINC150 Dataset (https://github.com/clinc/oos-eval).
"""


# Restrict the dataset to the following intents, including out-of-scope (NO_INTENT)
SUBSET_INTENTS = [
    "freeze_account",
    "routing",
    "pin_change",
    "bill_due",
    "pay_bill",
    "account_blocked",
    "interest_rate",
    "min_payment",
    "bill_balance",
    "transfer",
    "order_checks",
    "balance",
    "spending_history",
    "transactions",
    "report_fraud",
    "NO_INTENT",  # In the dataset this is called oos but we call it NO_INTENT
]


class CLINC150Config(datasets.BuilderConfig):
    """BuilderConfig for subset of CLINC 150 dataset."""

    def __init__(self, **kwargs):
        """BuilderConfig for subset of CLINC 150.
        Args:
          **kwargs: keyword arguments forwarded to super.
        """
        super(CLINC150Config, self).__init__(**kwargs)


class CLINC150Dataset(datasets.GeneratorBasedBuilder):
    """Clinc150 Dataset."""

    BUILDER_CONFIGS = [
        CLINC150Config(
            name="CLINC150",
            version=datasets.Version("1.0.0"),
            description=_DESCRIPTION,
        ),
    ]

    def __init__(self, *args, writer_batch_size=None, **kwargs):
        super(CLINC150Dataset, self).__init__(*args, **kwargs)

    def _info(self):
        return datasets.DatasetInfo(
            description=_DESCRIPTION,
            features=datasets.Features(
                {
                    "utterance": datasets.Value("string"),
                    "label": datasets.ClassLabel(
                        num_classes=len(SUBSET_INTENTS), names=SUBSET_INTENTS
                    ),
                }
            ),
        )

    def _split_generators(self, dl_manager):
        return [
            datasets.SplitGenerator(
                name=datasets.Split.TRAIN,
                gen_kwargs={"filepath": self.config.data_files["full"][0], "split": "train"},
            ),
            datasets.SplitGenerator(
                name=datasets.Split.VALIDATION,
                gen_kwargs={"filepath": self.config.data_files["full"][0], "split": "val"},
            ),
            datasets.SplitGenerator(
                name=datasets.Split.TEST,
                gen_kwargs={"filepath": self.config.data_files["full"][0], "split": "test"},
            ),
        ]

    def _generate_examples(self, filepath: str, split: str):
        """Generate intent examples."""
        filepath_suffix = Path(filepath).suffix.lower()

        if filepath_suffix == ".json":
            return self._read_json(filepath, split)
        else:
            raise ValueError(f"Invalid file extension: {filepath}")

    def _read_json(self, filepath, split: str):
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
            sample_idx = 0

            for sample in data[split]:
                # First element contains the utterance and the second contains the intent name
                intent_name = sample[1].lower()

                if intent_name in SUBSET_INTENTS:
                    yield sample_idx, {
                        "utterance": sample[0].lower(),
                        "label": intent_name,
                    }
                    sample_idx += 1

            # Handle oos -> NO_INTENT separately
            for sample in data["oos_" + split]:
                yield sample_idx, {
                    "utterance": sample[0].lower(),
                    "label": "NO_INTENT",
                }
                sample_idx += 1
