# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from collections import defaultdict
from functools import partial
from typing import Dict, List, Set

import numpy as np

from azimuth.config import DatasetWarningConfig
from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.modules.base_classes import ComparisonModule
from azimuth.plots.dataset_warnings import (
    class_imbalance_plot,
    class_representation,
    min_sample_count_plot,
    word_count_plot,
)
from azimuth.types import DatasetColumn, DatasetSplitName
from azimuth.types.dataset_warnings import (
    Agg,
    DatasetDistributionComparison,
    DatasetDistributionComparisonValue,
    DatasetWarning,
    DatasetWarningGroup,
    DatasetWarningsResponse,
    FormatType,
)


class DatasetWarningsModule(ComparisonModule[DatasetWarningConfig]):
    """Compute warnings related to difference between the training set and the evaluation set."""

    allowed_mod_options: Set[str] = set()

    def compute_on_dataset_split(self) -> List[DatasetWarningsResponse]:  # type: ignore
        """
        Analysis of the difference between the training set and evaluation set on different aspects,
        such as semantic differences, syntactic ones or general ones related
        to the class distribution.

        Returns:
            The warnings grouped by type.
        """
        dm_dict = {
            split: self.get_dataset_split_manager(split) for split in self.available_dataset_splits
        }

        return [
            DatasetWarningsResponse(
                warning_groups=[
                    DatasetWarningGroup(
                        name="General Warnings",
                        warnings=self.get_general_warnings(dm_dict),
                    ),
                    DatasetWarningGroup(
                        name="Syntactic Warnings",
                        warnings=self.get_syntactic_warnings(dm_dict),
                    ),
                ]
            )
        ]

    def get_general_warnings(
        self, dm_dict: Dict[DatasetSplitName, DatasetSplitManager]
    ) -> List[DatasetWarning]:
        """Generate different alerts based on sample count in each dataset split.

        Args:
            dm_dict: Dict with all dataset split managers.

        Returns:
            General warnings
        """
        first_dm = next(iter(dm_dict.values()))
        cls_names = first_dm.get_class_names(labels_only=True)

        count_per_cls_per_split = {
            s: dm.class_distribution(labels_only=True) for s, dm in dm_dict.items()
        }

        # Missing samples warning
        min_count_per_cls = self.config.dataset_warnings.min_num_per_class
        alert_min_per_cls_per_split: Dict[DatasetSplitName, np.ndarray] = defaultdict(
            partial(np.full, shape=len(cls_names), fill_value=False)
        )
        for split, count in count_per_cls_per_split.items():
            alert_min_per_cls_per_split[split] = count < min_count_per_cls

        alert_min_per_cls = (
            alert_min_per_cls_per_split[DatasetSplitName.train]
            | alert_min_per_cls_per_split[DatasetSplitName.eval]
        )

        warnings = [
            DatasetWarning(
                name=f"Missing samples (<{min_count_per_cls})",
                description=f"Nb of samples per class in the training or evaluation set is below "
                f"{min_count_per_cls}.",
                columns=list(reversed(sorted(count_per_cls_per_split.keys()))),
                format=FormatType.Integer,
                comparisons=[
                    DatasetDistributionComparison(
                        name=cls_name,
                        alert=alert_min_per_cls[i],
                        data=[
                            DatasetDistributionComparisonValue(
                                value=int(count[i]), alert=alert_min_per_cls_per_split[s][i]
                            )
                            # Training set needs to be first
                            for s, count in reversed(sorted(count_per_cls_per_split.items()))
                        ],
                    )
                    for i, cls_name in enumerate(cls_names)
                ],
                plots=min_sample_count_plot(
                    count_per_cls_per_split,
                    min_count_per_cls,
                    alert_min_per_cls_per_split,
                    cls_names,
                ),
            )
        ]

        # Class imbalance warning
        mean_per_split = {}
        imb_per_cls_per_split = {}
        for split, count in count_per_cls_per_split.items():
            mean_per_split[split] = np.mean(count)
            imb_per_cls_per_split[split] = count / mean_per_split[split] - 1

        max_delta_imb = self.config.dataset_warnings.max_delta_class_imbalance
        alert_imb_per_cls_per_split: Dict[DatasetSplitName, np.ndarray] = defaultdict(
            partial(np.full, shape=len(cls_names), fill_value=False)
        )
        for s, imb in imb_per_cls_per_split.items():
            alert_imb_per_cls_per_split[s] = np.abs(imb) > max_delta_imb

        alert_imb_per_cls = (
            alert_imb_per_cls_per_split[DatasetSplitName.train]
            | alert_imb_per_cls_per_split[DatasetSplitName.eval]
        )

        warnings.append(
            DatasetWarning(
                name=f"Class imbalance" f" (>{max_delta_imb * 100:.0f}%)",
                description=f"Relative difference between the number of "
                f"samples per class and the mean in each dataset split is above "
                f"{max_delta_imb * 100:.0f}%.",
                columns=list(reversed(sorted(imb_per_cls_per_split.keys()))),
                format=FormatType.Percentage,
                comparisons=[
                    DatasetDistributionComparison(
                        name=cls_name,
                        alert=alert_imb_per_cls[i],
                        data=[
                            DatasetDistributionComparisonValue(
                                value=imb[i], alert=alert_imb_per_cls_per_split[s][i]
                            )
                            # Training set needs to be first
                            for s, imb in reversed(sorted(imb_per_cls_per_split.items()))
                        ],
                    )
                    for i, cls_name in enumerate(cls_names)
                ],
                plots=class_imbalance_plot(
                    count_per_cls_per_split,
                    mean_per_split,
                    max_delta_imb,
                    alert_imb_per_cls_per_split,
                    cls_names,
                ),
            )
        )

        # Class representation warning - only useful with 2 dataset splits
        if len(self.available_dataset_splits) == 2:
            count_norm_per_cls_per_split = {
                s: c / sum(c) for s, c in count_per_cls_per_split.items()
            }
            divergence_norm_per_cls = (
                count_norm_per_cls_per_split[DatasetSplitName.eval]
                - count_norm_per_cls_per_split[DatasetSplitName.train]
            )
            max_delta_representation = self.config.dataset_warnings.max_delta_representation
            alert_norm_per_cls = np.abs(divergence_norm_per_cls) > max_delta_representation

            warnings.append(
                DatasetWarning(
                    name=f"Representation mismatch " f"(>{100 * max_delta_representation:.0f}%)",
                    description=f"Absolute difference between the proportion of a given class in "
                    f"the training set vs the evaluation set is above "
                    f"{100 * max_delta_representation:.0f}%.",
                    columns=["abs. diff."],
                    format=FormatType.Percentage,
                    comparisons=[
                        DatasetDistributionComparison(
                            name=cls_name,
                            alert=alert_norm_per_cls[i],
                            data=[
                                DatasetDistributionComparisonValue(
                                    value=float(np.abs(divergence_norm_per_cls[i])),
                                    alert=alert_norm_per_cls[i],
                                )
                            ],
                        )
                        for i, cls_name in enumerate(cls_names)
                    ],
                    plots=class_representation(
                        count_per_cls_per_split,
                        count_norm_per_cls_per_split,
                        divergence_norm_per_cls,
                        max_delta_representation,
                        cls_names,
                    ),
                )
            )
        return warnings

    def get_syntactic_warnings(
        self, dm_dict: Dict[DatasetSplitName, DatasetSplitManager]
    ) -> List[DatasetWarning]:
        """Generate warnings related to the syntax of the utterances.

        Args:
            dm_dict: Dict with all dataset split managers.

        Returns:
            List of syntactic warnings.

        """
        first_dm = next(iter(dm_dict.values()))
        cls_indices = np.arange(first_dm.get_num_classes(labels_only=True))
        value_per_agg_per_split: Dict[DatasetSplitName, Dict[Agg, float]] = defaultdict(dict)
        value_per_cls_per_agg_per_split: Dict[
            DatasetSplitName, Dict[Agg, np.ndarray]
        ] = defaultdict(dict)
        hist_per_cls_per_split = {}

        for split in self.available_dataset_splits:
            ds = self.get_dataset_split(split)
            df = ds.remove_columns(
                list(set(ds.column_names) - {DatasetColumn.word_count, self.config.columns.label})
            ).to_pandas()

            value_per_agg_per_split[split][Agg.mean] = df["word_count"].mean()
            value_per_agg_per_split[split][Agg.std] = df["word_count"].std()

            # Get mean and std word count per class
            stats_per_cls = df.groupby("label").agg(list(Agg)).reindex(cls_indices)
            for agg in Agg:
                value_per_cls_per_agg_per_split[split][agg] = stats_per_cls["word_count"][
                    agg
                ].to_numpy()

            # Get word count histogram per class. Columns are word counts and rows are classes.
            hist_per_cls_per_split[split] = (
                df.groupby(["label", "word_count"])
                .size()
                .unstack(fill_value=0)
                .reindex(cls_indices, fill_value=0)
            )

        # Compute divergence and alerts
        divergence_per_cls_per_agg: Dict[Agg, np.ndarray] = defaultdict(
            partial(np.full, shape=len(cls_indices), fill_value=np.nan)
        )
        alert_per_cls_per_agg: Dict[Agg, np.ndarray] = defaultdict(
            partial(np.full, shape=len(cls_indices), fill_value=False)
        )
        threshold_per_agg = {
            Agg.mean: self.config.dataset_warnings.max_delta_mean_words,
            Agg.std: self.config.dataset_warnings.max_delta_std_words,
        }
        if len(self.available_dataset_splits) == 2:
            for agg, threshold in threshold_per_agg.items():
                divergence_per_cls_per_agg[agg] = np.abs(
                    value_per_cls_per_agg_per_split[DatasetSplitName.train][agg]
                    - value_per_cls_per_agg_per_split[DatasetSplitName.eval][agg]
                )
                alert_per_cls_per_agg[agg] = divergence_per_cls_per_agg[agg] > threshold
        alert_per_cls = np.any(
            [alert_per_cls_per_agg[Agg.mean], alert_per_cls_per_agg[Agg.std]], axis=0
        )

        # Fill columns so both splits have the same values from 1 to N.
        N = max(max(hist.columns) for hist in hist_per_cls_per_split.values())
        hist_filled_per_cls_per_split = {}
        for split, hist_per_cls in hist_per_cls_per_split.items():
            hist_filled_per_cls_per_split[split] = np.zeros([len(hist_per_cls), N], dtype=int)
            # Fill with token count (-1 because columns start at 1)
            hist_filled_per_cls_per_split[split][
                :, np.array(hist_per_cls.columns) - 1
            ] = hist_per_cls.to_numpy()

        cls_names = first_dm.get_class_names(labels_only=True)
        return [
            DatasetWarning(
                name=f"Length mismatch "
                f"(>{threshold_per_agg[Agg.mean]}±{threshold_per_agg[Agg.std]} words)",
                description=f"Delta between the number of words per utterance for a "
                f"given class in the evaluation set vs the train set is "
                f"above {threshold_per_agg[Agg.mean]}±{threshold_per_agg[Agg.std]}.",
                columns=list(Agg),
                format=FormatType.Decimal,
                comparisons=[
                    DatasetDistributionComparison(
                        name=cls_names[i],
                        alert=alert_per_cls[i],
                        data=[
                            DatasetDistributionComparisonValue(
                                value=divergence_per_cls_per_agg[agg][i],
                                alert=alert_per_cls_per_agg[agg][i],
                            )
                            for agg in Agg
                        ],
                    )
                    for i in cls_indices
                ],
                plots=word_count_plot(
                    hist_filled_per_cls_per_split,
                    value_per_agg_per_split,
                    value_per_cls_per_agg_per_split,
                    divergence_per_cls_per_agg,
                    cls_names,
                ),
            )
        ]
