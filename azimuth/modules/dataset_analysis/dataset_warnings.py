# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import List, Set, cast

import numpy as np
import pandas as pd

from azimuth.config import DatasetWarningConfig
from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.modules.base_classes.aggregation_module import ComparisonModule
from azimuth.plots.dataset_warnings import (
    class_representation,
    min_nb_samples_plot,
    nb_tokens_plot,
)
from azimuth.types.dataset_warnings import (
    DatasetDistributionComparison,
    DatasetDistributionComparisonValue,
    DatasetWarning,
    DatasetWarningGroup,
    DatasetWarningsResponse,
    FormatType,
)
from azimuth.types.general.dataset import DatasetColumn, DatasetSplitName


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

        return [
            DatasetWarningsResponse(
                warning_groups=[
                    DatasetWarningGroup(
                        name="General Warnings",
                        warnings=self.get_general_warnings(train_mng, eval_mng),
                    ),
                    DatasetWarningGroup(
                        name="Syntactic Warnings",
                        warnings=self.get_syntactic_warnings(train_mng, eval_mng),
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
        train_dist = train_mng.class_distribution()
        eval_dist = eval_mng.class_distribution()
        min_num_per_class = self.config.dataset_warnings.min_num_per_class
        alert_train_nb_min: List[bool] = train_dist < min_num_per_class
        alert_eval_nb_min: List[bool] = eval_dist < min_num_per_class
        alert_nb_min: List[bool] = alert_train_nb_min + alert_eval_nb_min

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
                        name=train_mng.class_names[i],
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
                    train_mng.class_names,
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
                        name=train_mng.class_names[i],
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
                    train_mng.class_names,
                ),
            ),
        ]

    def get_syntactic_warnings(
        self, train_mng: DatasetSplitManager, eval_mng: DatasetSplitManager
    ) -> List[DatasetWarning]:
        """Generate warnings related to the syntax of the utterances.

        Args:
            train_mng: Dataset manager for the training set.
            eval_mng: Dataset manager for the evaluation set.

        Returns:
            List of syntactic warnings.

        """
        train_ds, eval_ds = train_mng.get_dataset_split(), eval_mng.get_dataset_split()
        train_dist = train_mng.class_distribution()
        cls_index = np.arange(len(train_mng.class_names))

        # Get token lenght and other (see screen 3b)
        train_df = pd.DataFrame(
            {
                DatasetColumn.token_count: train_ds[DatasetColumn.token_count],
                "label": train_ds[self.config.columns.label],
            }
        )
        eval_df = pd.DataFrame(
            {
                DatasetColumn.token_count: eval_ds[DatasetColumn.token_count],
                "label": eval_ds[self.config.columns.label],
            }
        )

        # overall stats
        train_overall = np.mean(cast(List[int], train_ds[DatasetColumn.token_count])), np.std(
            cast(List[int], train_ds[DatasetColumn.token_count])
        )
        eval_overall = np.mean(cast(List[int], eval_ds[DatasetColumn.token_count])), np.std(
            cast(List[int], eval_ds[DatasetColumn.token_count])
        )

        # Get mean and std token lengths
        train_desc = train_df.groupby("label").agg(["mean", "std"])
        eval_desc = eval_df.groupby("label").agg(["mean", "std"])
        # Compute divergence
        divergence = (train_desc - eval_desc)[DatasetColumn.token_count].apply(np.abs)
        divergence = fill_at_missing_indices(divergence, find_missing_rows(divergence, cls_index))
        divergence_mean = divergence["mean"].to_numpy()
        divergence_std = divergence["std"].to_numpy()

        # Make alerts from values.
        max_delta_mean_tokens = int(self.config.dataset_warnings.max_delta_mean_tokens)
        max_delta_std_tokens = int(self.config.dataset_warnings.max_delta_std_tokens)
        alert_norm_mean = divergence_mean > max_delta_mean_tokens
        alert_norm_std = divergence_std > max_delta_std_tokens
        alert_norm = np.any([alert_norm_mean, alert_norm_std], axis=0)

        # Get counts, this will have N columns with count and LABEL rows.
        train_count = (
            train_df.groupby(["label", DatasetColumn.token_count]).size().unstack(fill_value=0)
        )
        eval_count = (
            eval_df.groupby(["label", DatasetColumn.token_count]).size().unstack(fill_value=0)
        )

        train_missing_cols = find_missing_rows(train_count, cls_index)
        eval_missing_cols = find_missing_rows(eval_count, cls_index)
        train_count = fill_at_missing_indices(train_count, train_missing_cols)
        eval_count = fill_at_missing_indices(eval_count, eval_missing_cols)
        # Add to mean too.
        train_desc = fill_at_missing_indices(
            train_desc, train_missing_cols, fill_value=float("nan")
        )
        eval_desc = fill_at_missing_indices(eval_desc, eval_missing_cols, fill_value=float("nan"))

        # Get the same x-axis for everyone.
        N = max(max(train_count.columns), max(eval_count.columns))
        train_count_filled = np.zeros([len(train_count), N], dtype=int)
        test_count_filled = np.zeros([len(eval_count), N], dtype=int)

        # Fill with token count (-1 because columns start at 1)
        train_count_filled[:, np.array(train_count.columns) - 1] = train_count.to_numpy()
        test_count_filled[:, np.array(eval_count.columns) - 1] = eval_count.to_numpy()

        return [
            DatasetWarning(
                name=f"Length mismatch "
                f"(>{max_delta_mean_tokens}±{max_delta_std_tokens} tokens)",
                description=f"Delta between the number of tokens of a "
                f"given class in the evaluation set vs the train set is "
                f"above {max_delta_mean_tokens}±{max_delta_std_tokens}.",
                columns=["mean", "std"],
                format=FormatType.Decimal,
                comparisons=[
                    DatasetDistributionComparison(
                        name=train_mng.class_names[i],
                        alert=alert_norm[i],
                        data=[
                            DatasetDistributionComparisonValue(
                                value=divergence_mean[i], alert=alert_norm_mean[i]
                            ),
                            DatasetDistributionComparisonValue(
                                value=divergence_std[i], alert=alert_norm_std[i]
                            ),
                        ],
                    )
                    for i, _ in enumerate(train_dist)
                ],
                plots=nb_tokens_plot(
                    train_count_filled,
                    test_count_filled,
                    max_delta_mean_tokens,
                    max_delta_std_tokens,
                    train_desc,
                    eval_desc,
                    train_overall,
                    eval_overall,
                    divergence_mean,
                    divergence_std,
                    train_mng.class_names,
                ),
            )
        ]


def find_missing_rows(df1, ref: np.ndarray):
    # Get rows missing from df1 according to a reference.
    return set(ref).difference(set(df1.index))


def fill_at_missing_indices(df, indices, fill_value=0.0):
    for i in indices:
        df.loc[i] = [fill_value] * len(df.columns)
    return df.sort_index()
