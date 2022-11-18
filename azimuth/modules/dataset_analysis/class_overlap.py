# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from dataclasses import asdict
from typing import List

import numpy as np
from spectral_metric.estimator import CumulativeGradientEstimator

from azimuth.config import SimilarityConfig
from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.modules.base_classes import AggregationModule, DatasetResultModule
from azimuth.modules.dataset_analysis.similarity_analysis import FAISSModule
from azimuth.modules.task_execution import get_task_result
from azimuth.types import Array, DatasetColumn, DatasetSplitName
from azimuth.types.class_overlap import ClassOverlapResponse
from azimuth.types.similarity_analysis import FAISSResponse
from azimuth.types.tag import TaggingResponse


def take(generator, length):
    lst = []
    for _, v in zip(range(length), generator):
        lst.append(v)
    return lst


def get_volume(dt) -> float:
    """Get the volume of the minimum box around a set of points.

    A Parzen-window is a non-parametric KDE method.
    We define a box around the origin (ie the point we want to analyse)
    bounded by all neighbors. We then compute the volume of this box.

    Args:
        dt: Features we would like to get the volume of. dt[0] is the origin.

    Returns:
        float, the volume of the box.
    """
    # Compute the volume of the parzen-window
    dst = (np.abs(dt[1:] - dt[0]).max(0) * 2).prod()
    # Minimum is 1e-4 to avoid division per 0
    res: float = max(1e-4, dst)
    return res


class ClassOverlapModule(AggregationModule[SimilarityConfig]):
    allowed_splits = {DatasetSplitName.train}

    def compute_on_dataset_split(self) -> List[ClassOverlapResponse]:  # type: ignore
        # We use the train set to get the features.
        train_dm = self.get_dataset_split_manager(DatasetSplitName.train)
        train_features = np.array(self._get_features(DatasetSplitName.train))

        labels = np.array(train_dm.get_dataset_split()[self.config.columns.label])
        estimator = CumulativeGradientEstimator(M_sample=1, k_nearest=5)
        estimator.fit(data=train_features, target=labels)

        # Convert SimilarityArrays to dicts to be loaded by Pydantic.
        similarity_arrays = {
            class_idx: {index: asdict(sim_array) for index, sim_array in class_dict.items()}
            for class_idx, class_dict in estimator.similarity_arrays.items()
        }
        return [
            ClassOverlapResponse(
                evals=estimator.evals,
                evecs=estimator.evecs,
                difference=estimator.difference,
                s_matrix=estimator.S,
                similarity_arrays=similarity_arrays,
            )
        ]

    def _get_features(self, ds_split_name: DatasetSplitName) -> List[Array]:
        """
        Get Sentence embedding features
        Args:
            ds_split_name: Name of the dataset_split to get

        Returns:
            Features for all indices.
        """
        mod = FAISSModule(
            dataset_split_name=ds_split_name,
            config=self.config,
        )
        result = get_task_result(mod, List[FAISSResponse])
        return [r.features for r in result]


class OverlapTaggingModule(DatasetResultModule[SimilarityConfig]):
    """Finds overlap and sets overlap smart tags for each utterance in the train split."""

    def compute_on_dataset_split(self) -> List[TaggingResponse]:  # type: ignore
        if self.dataset_split_name == DatasetSplitName.train:
            mod = ClassOverlapModule(dataset_split_name=DatasetSplitName.train, config=self.config)
            result = get_task_result(mod, List[ClassOverlapResponse])[0]
            similarity_arrays = result.similarity_arrays

            # Pull overlap array to first dictionary level and set overlap to False when i==j
            res = {
                sample_ix: [
                    overlap > 0 if n != class_ix else False
                    for n, overlap in enumerate(sample_arrays.sample_probability_norm)
                ]
                for class_ix, all_sample_arrays in similarity_arrays.items()
                for sample_ix, sample_arrays in all_sample_arrays.items()
            }
            sample_count = len(res.keys())

            return [
                TaggingResponse(
                    tags={},
                    adds={
                        DatasetColumn.overlapped_classes: [
                            i for i, overlap_bool in enumerate(res[sample_ix]) if overlap_bool
                        ]
                    },
                )
                for sample_ix in range(sample_count)
            ]
        else:
            return [[]] * self.get_dataset_split_manager(self.dataset_split_name).num_rows

    def _save_result(self, res: List[TaggingResponse], dm: DatasetSplitManager):  # type: ignore
        """Save tags for class overlap.

        Args:
            res: Results from `compute_on_dataset_split`
            dm: the dataset_split manager used to get `res`.
        """
        if dm.name == DatasetSplitName.train:
            # We don't need the table key as this is not a "prediction tag"
            for col_name in res[0].adds.keys():
                dm.add_column(key=col_name, features=[r.adds[col_name] for r in res])
