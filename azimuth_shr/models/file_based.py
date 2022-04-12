from typing import Any, Dict

import numpy as np
import pandas as pd
from datasets import Dataset

"""
These comes from Azimuth codebase. You can access them from user-defined modules.
"""
from azimuth.types.general.dataset import DatasetColumn, DatasetSplitName
from azimuth.utils.object_loader import load_custom_object

MAX_PREDS = 5


class FileBasedModel:
    def __init__(self, test_path, azimuth_config):
        self.azimuth_config = azimuth_config
        train_ds: Dataset = load_custom_object(
            azimuth_config.dataset, azimuth_config=azimuth_config
        )[DatasetSplitName.train]
        self.train_labels = train_ds.features[azimuth_config.columns.label].names
        self.data = {
            DatasetSplitName.train: train_ds.to_pandas(),
            DatasetSplitName.eval: pd.read_csv(test_path, delimiter=",", keep_default_na=False),
        }
        self.data = {split: self._make_probs(df) for split, df in self.data.items()}

    def parse_label(self, cls_name):
        return self.train_labels.index(cls_name)

    def _make_probs(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add column `probs` to df.

        Reads Pred{i}, Pred{i}Score from the dataframe and
        create a probability distribution by matching Pred to class indices (from train set's).
        If some mass is missing, we fill the remaining classes with what's missing.

        Args:
            df: current dataframe

        Returns:
            Dataframe with `probs` columns

        """

        def fn(item):
            probabilities = np.zeros(len(self.train_labels))
            pairs = [
                (self.parse_label(item[f"Pred{i}"]), item[f"Pred{i}Score"])
                for i in range(MAX_PREDS)
                if f"Pred{i}" in item
            ]
            if pairs:
                idx, probs = zip(*pairs)
                if probs == ("",):
                    probs = 1.0
                probabilities[np.array(idx)] = np.array(probs)
            else:
                # If we have no pred, we get the label
                probabilities[item[self.azimuth_config.columns.label]] = 1.0
            if not np.isclose(0.0, diff := 1.0 - probabilities.sum()):
                probabilities[probabilities == 0.0] = diff / (probabilities == 0.0).sum()
            return probabilities

        df["probs"] = df.apply(fn, axis=1)
        return df

    def __call__(self, utterances: Dict[str, Any], dataset_split):
        row_idx = utterances[DatasetColumn.row_idx]
        probs = np.stack(self.data[dataset_split].loc[row_idx, "probs"].to_numpy())
        return probs
