from collections import defaultdict
from typing import Dict, List

import numpy as np
from sklearn.metrics import pairwise_distances
from spectral_metric.estimator import CumulativeGradientEstimator

from azimuth.config import SimilarityConfig
from azimuth.modules.base_classes.aggregation_module import AggregationModule
from azimuth.modules.dataset_analysis.similarity_analysis import FAISSModule
from azimuth.modules.task_execution import get_task_result
from azimuth.types.general.array_type import Array
from azimuth.types.general.dataset import DatasetSplitName
from azimuth.types.similarity_analysis import FAISSResponse
from azimuth.types.spectral_clustering import SpectralClusteringResponse

SCALING_FACTOR = 3  # Makes relevant items easier to see.

HIGH_SIMILARITY_TH = 0.3  # That means that more than 30% of the neighbours are from another class.

RELEVANT_ITEM_TH = 0.1  # We do not display items in the graph below this.


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


class SpectralClusteringModule(AggregationModule[SimilarityConfig]):
    allowed_splits = {DatasetSplitName.train}

    def compute_on_dataset_split(self):
        # We use the train set to get the features.
        train_dm = self.get_dataset_split_manager(DatasetSplitName.train)
        train_features = np.array(self._get_features(DatasetSplitName.train))

        labels = np.array(train_dm.get_dataset_split()[self.config.columns.label])
        estimator = CumulativeGradientEstimator(M_sample=250, k_nearest=5)
        estimator.fit(data=train_features, target=labels)
        return [
            SpectralClusteringResponse(
                evals=estimator.evals, evecs=estimator.evecs, difference=estimator.difference
            )
        ]

    def get_probabilistic_knn(self, dist_name="euclidean", k_nearest=5) -> Dict[int, List]:
        """Get k-NN score per utterance per label.

        Args:
            dist_name: Name of the metric ("cosine", "euclidean")
            k_nearest: Number of neighbhors in K-NN.

        Returns:
            Dictionnary for all class of the Parzen-window probabilistic K-NN output.
        """
        train_dm = self.get_dataset_split_manager(DatasetSplitName.train)
        train_features = np.array(self._get_features(DatasetSplitName.train))
        labels = np.array(train_dm.get_dataset_split()[self.config.columns.label])
        n_class = train_dm.num_classes

        similarities = lambda k: np.array(
            pairwise_distances(train_features[labels == k], train_features, metric=dist_name)
        )
        expectation = defaultdict(list)
        for k in range(n_class):
            if (labels == k).sum() == 0:
                continue
            distances = similarities(k)
            for to_keep in distances:
                nearest = to_keep.argsort()[: k_nearest + 1]
                target_k = np.array(labels)[nearest[1:]]
                # Get the Parzen-Window probability
                expectation[k].append(
                    (
                        nearest[1:],
                        (
                            np.array(
                                [(target_k == ki).sum() / len(target_k) for ki in range(n_class)]
                            )
                        )
                        / get_volume(train_features[nearest]),
                    )
                )
        return expectation

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
