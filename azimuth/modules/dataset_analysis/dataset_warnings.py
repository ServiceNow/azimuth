# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from collections import defaultdict
from typing import Dict, List, Set

import numpy as np

from azimuth.config import DatasetWarningConfig
from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.modules.base_classes import ComparisonModule
from azimuth.plots.dataset_warnings import (
    class_imbalance_plot,
    class_representation,
    min_nb_samples_plot,
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
        train_mng = self.get_dataset_split_manager(DatasetSplitName.train)
        eval_mng = self.get_dataset_split_manager(DatasetSplitName.eval)

        dm = train_mng or eval_mng

        return [
            DatasetWarningsResponse(
                warning_groups=[
                    DatasetWarningGroup(
                        name="General Warnings",
                        warnings=self.get_general_warnings(train_mng, eval_mng),
                    ),
                    DatasetWarningGroup(
                        name="Syntactic Warnings",
                        warnings=self.get_syntactic_warnings(dm),
                    ),
                ]
            )
        ]

    def get_general_warnings(
        self, train_mng: DatasetSplitManager, eval_mng: DatasetSplitManager
    ) -> List[DatasetWarning]:
        """
        From the train and eval sets, generate different alerts based on nb of samples and class
        distribution.

        Args:
            train_mng: Manager for the training set
            eval_mng: Manager for the evaluation set

        Returns:
            Dictionary with different alerts
        """
        train_dist = train_mng.class_distribution(labels_only=True)
        eval_dist = eval_mng.class_distribution(labels_only=True)
        class_names = train_mng.get_class_names(labels_only=True)
        min_num_per_class = self.config.dataset_warnings.min_num_per_class
        alert_train_nb_min = train_dist < min_num_per_class
        alert_eval_nb_min = eval_dist < min_num_per_class
        alert_nb_min = alert_train_nb_min | alert_eval_nb_min

        train_mean = np.mean(train_dist)
        eval_mean = np.mean(eval_dist)
        perc_imb_train = train_dist / train_mean - 1
        perc_imb_eval = eval_dist / eval_mean - 1
        max_delta_imb = self.config.dataset_warnings.max_delta_class_imbalance
        alert_imb_train = np.abs(perc_imb_train) > max_delta_imb
        alert_imb_eval = np.abs(perc_imb_eval) > max_delta_imb
        alert_imb = alert_imb_train | alert_imb_eval

        train_dist_norm = train_dist / sum(train_dist)
        eval_dist_norm = eval_dist / sum(eval_dist)
        max_delta_representation = self.config.dataset_warnings.max_delta_representation
        divergence_norm = eval_dist_norm - train_dist_norm
        alert_norm = np.logical_or(
            divergence_norm > max_delta_representation, divergence_norm < -max_delta_representation
        )

        return [
            DatasetWarning(
                name=f"Missing samples (<{min_num_per_class})",
                description=f"Nb of samples per class in the training or evaluation set is below "
                f"{min_num_per_class}.",
                columns=["training", "evaluation"],
                format=FormatType.Integer,
                comparisons=[
                    DatasetDistributionComparison(
                        name=class_names[i],
                        alert=alert_nb_min[i],
                        data=[
                            DatasetDistributionComparisonValue(
                                value=int(train_dist[i]), alert=alert_train_nb_min[i]
                            ),
                            DatasetDistributionComparisonValue(
                                value=int(eval_dist[i]), alert=alert_eval_nb_min[i]
                            ),
                        ],
                    )
                    for i, _ in enumerate(train_dist)
                ],
                plots=min_nb_samples_plot(
                    train_dist,
                    eval_dist,
                    min_num_per_class,
                    alert_train_nb_min,
                    alert_eval_nb_min,
                    class_names,
                ),
            ),
            DatasetWarning(
                name=f"Class imbalance" f" (>{max_delta_imb*100:.0f}%)",
                description=f"Relative difference between the number of "
                f"samples per class and the mean in each dataset split is above "
                f"{max_delta_imb*100:.0f}%.",
                columns=["training", "evaluation"],
                format=FormatType.Percentage,
                comparisons=[
                    DatasetDistributionComparison(
                        name=class_names[i],
                        alert=alert_imb[i],
                        data=[
                            DatasetDistributionComparisonValue(
                                value=perc_imb_train[i], alert=alert_imb_train[i]
                            ),
                            DatasetDistributionComparisonValue(
                                value=perc_imb_eval[i], alert=alert_imb_eval[i]
                            ),
                        ],
                    )
                    for i, _ in enumerate(alert_imb)
                ],
                plots=class_imbalance_plot(
                    train_dist,
                    eval_dist,
                    train_mean,
                    eval_mean,
                    max_delta_imb,
                    alert_imb_train,
                    alert_imb_eval,
                    class_names,
                ),
            ),
            DatasetWarning(
                name=f"Representation mismatch " f"(>{100 * max_delta_representation:.0f}%)",
                description=f"Absolute difference between the proportion of a given class in the "
                f"training set vs the evaluation set is above "
                f"{100 * max_delta_representation:.0f}%.",
                columns=["abs. diff."],
                format=FormatType.Percentage,
                comparisons=[
                    DatasetDistributionComparison(
                        name=class_names[i],
                        alert=alert_norm[i],
                        data=[
                            DatasetDistributionComparisonValue(
                                value=float(np.abs(divergence_norm[i])), alert=alert_norm[i]
                            )
                        ],
                    )
                    for i, _ in enumerate(train_dist)
                ],
                plots=class_representation(
                    train_dist,
                    eval_dist,
                    train_dist_norm,
                    eval_dist_norm,
                    divergence_norm,
                    max_delta_representation,
                    class_names,
                ),
            ),
        ]

    def get_syntactic_warnings(self, dm: DatasetSplitManager) -> List[DatasetWarning]:
        """Generate warnings related to the syntax of the utterances.

        Args:
            dm: DatasetSplitManager for either split.

        Returns:
            List of syntactic warnings.

        """
        class_indices = np.arange(dm.get_num_classes(labels_only=True))
        value_per_agg_per_split: Dict[DatasetSplitName, Dict[Agg, float]] = defaultdict(dict)
        value_per_label_per_agg_per_split: Dict[
            DatasetSplitName, Dict[Agg, np.ndarray]
        ] = defaultdict(dict)
        hist_per_label_per_split = {}

        for split in self.available_dataset_splits:
            ds = self.get_dataset_split(split).remove_columns([])
            df = ds.remove_columns(
                [
                    column
                    for column in ds.column_names
                    if column not in [DatasetColumn.word_count, self.config.columns.label]
                ]
            ).to_pandas()

            value_per_agg_per_split[split][Agg.mean] = df["word_count"].mean()
            value_per_agg_per_split[split][Agg.std] = df["word_count"].std()

            # Get mean and std word count per label
            stats_per_label = df.groupby("label").agg(list(Agg)).reindex(class_indices)
            for agg in Agg:
                value_per_label_per_agg_per_split[split][agg] = stats_per_label["word_count"][
                    agg
                ].to_numpy()

            # Get word count histogram per label. Columns are word counts and rows are labels.
            hist_per_label_per_split[split] = (
                df.groupby(["label", "word_count"])
                .size()
                .unstack(fill_value=0)
                .reindex(class_indices, fill_value=0)
            )

        # Compute divergence and alerts
        divergence_per_label_per_agg = {}
        alert_per_label_per_agg = {}
        threshold_per_agg = {
            Agg.mean: self.config.dataset_warnings.max_delta_mean_words,
            Agg.std: self.config.dataset_warnings.max_delta_std_words,
        }
        for agg, threshold in threshold_per_agg.items():
            divergence_per_label_per_agg[agg] = np.abs(
                value_per_label_per_agg_per_split[DatasetSplitName.train][agg]
                - value_per_label_per_agg_per_split[DatasetSplitName.eval][agg]
            )
            alert_per_label_per_agg[agg] = divergence_per_label_per_agg[agg] > threshold
        alert_per_label = np.any(
            [alert_per_label_per_agg[Agg.mean], alert_per_label_per_agg[Agg.std]], axis=0
        )

        # Fill columns so both splits have the same values from 1 to N.
        N = max(
            max(hist_per_label_per_split[split].columns) for split in self.available_dataset_splits
        )
        hist_filled_per_split_per_label = dict()
        for split, hist_per_label in hist_per_label_per_split.items():
            hist_filled_per_split_per_label[split] = np.zeros([len(hist_per_label), N], dtype=int)
            # Fill with token count (-1 because columns start at 1)
            hist_filled_per_split_per_label[split][
                :, np.array(hist_per_label.columns) - 1
            ] = hist_per_label.to_numpy()

        class_names = dm.get_class_names(labels_only=True)
        return [
            DatasetWarning(
                name=f"Length mismatch "
                f"(>{threshold_per_agg[Agg.mean]}±{threshold_per_agg[Agg.std]} words)",
                description=f"Delta between the number of words per utterance for a "
                f"given class in the evaluation set vs the train set is "
                f"above {threshold_per_agg[Agg.mean]}±{threshold_per_agg[Agg.std]}.",
                columns=["mean", "std"],
                format=FormatType.Decimal,
                comparisons=[
                    DatasetDistributionComparison(
                        name=class_names[i],
                        alert=alert_per_label[i],
                        data=[
                            DatasetDistributionComparisonValue(
                                value=divergence_per_label_per_agg[agg][i],
                                alert=alert_per_label_per_agg[agg][i],
                            )
                            for agg in Agg
                        ],
                    )
                    for i in class_indices
                ],
                plots=word_count_plot(
                    hist_filled_per_split_per_label,
                    value_per_agg_per_split,
                    value_per_label_per_agg_per_split,
                    divergence_per_label_per_agg,
                    class_names,
                ),
            )
        ]
