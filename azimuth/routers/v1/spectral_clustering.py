from typing import Dict

from fastapi import APIRouter, Depends

from azimuth.app import get_all_dataset_split_managers, get_task_manager
from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.plots.sankey_plot import make_sankey_plot
from azimuth.task_manager import TaskManager
from azimuth.types import DatasetSplitName, PlotSpecification, SupportedModule
from azimuth.types.spectral_clustering import SpectralClusteringResponse
from azimuth.utils.routers import get_standard_task_result

router = APIRouter()

TAGS = ["Spectral Clustering v1"]


@router.get(
    "",
    summary="Get spectral clustering plot.",
    description="Get a similarity plot using Spectral clustering and Monte-Carlo sampling.",
    tags=TAGS,
    response_model=PlotSpecification,
)
def get_spectral_clustering_plot(
    task_manager: TaskManager = Depends(get_task_manager),
    dataset_split_managers: Dict[DatasetSplitName, DatasetSplitManager] = Depends(
        get_all_dataset_split_managers
    ),
) -> PlotSpecification:
    dm = dataset_split_managers[DatasetSplitName.train]

    task_result: SpectralClusteringResponse = get_standard_task_result(
        SupportedModule.SpectralClustering,
        dataset_split_name=DatasetSplitName.train,
        task_manager=task_manager,
        last_update=-1,
    )[0]
    plot = make_sankey_plot(task_result, dm)

    return plot
