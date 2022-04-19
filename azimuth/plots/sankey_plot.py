# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
import json
from itertools import cycle, product

import numpy as np
from matplotlib.colors import to_rgb
from plotly import graph_objects as go

from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.modules.dataset_analysis.spectral_clustering import (
    HIGH_SIMILARITY_TH,
    RELEVANT_ITEM_TH,
    SCALING_FACTOR,
    take,
)
from azimuth.types.general.alias_model import PlotSpecification
from azimuth.types.spectral_clustering import SpectralClusteringResponse
from azimuth.utils.plots import SANKEY_PALETTE


def make_sankey_plot(
    response: SpectralClusteringResponse, dataset_manager: DatasetSplitManager
) -> PlotSpecification:
    """
    Plot the result of SpectralClusteringResponse as a Sankey plot

    Args:
        response: Result of `compute_on_dataset_split`
        dataset_manager: One dataset manager

    Returns:
        Sankey plot showing the similarity between classes.
    """

    def to_rgba_pl(col, alpha):
        rgb = to_rgb(col)
        r, g, b = [int(c * 255) for c in rgb]
        return f"rgba({r},{g},{b},{alpha})"

    source, target, value, similarity = [], [], [], []

    sim: np.ndarray = 1.0 - response.difference
    diff = response.difference
    sim_shape: int = sim.shape[0]
    class_names = dataset_manager.get_class_names(labels_only=True)[:sim_shape]
    colors = take(cycle(SANKEY_PALETTE), sim_shape)
    for i, j in product(np.arange(sim_shape), np.arange(sim_shape)):
        if i == j:
            continue
        sim_value = sim[i, j]
        if sim_value < RELEVANT_ITEM_TH:
            continue
        j_index = j + sim.shape[0]
        source.append(i)
        target.append(j_index)
        value.append((sim_value * 100) ** SCALING_FACTOR)
        similarity.append(sim_value)

    order_y = (diff.sum(-1) / diff.sum()).tolist() + (diff.sum(0) / diff.sum()).tolist()
    order_x = [0] * len(class_names) + [1] * len(class_names)
    higher_than_thresh = sim > HIGH_SIMILARITY_TH  # Arbitrary threshold.
    custom_data = (
        np.array(higher_than_thresh.sum(-1).tolist() + higher_than_thresh.sum(0).tolist()) - 1.0
    )
    fig = go.Figure(
        data=[
            go.Sankey(
                arrangement="snap",
                node=dict(
                    x=order_x,
                    y=order_y + order_y,
                    pad=15,
                    thickness=20,
                    label=class_names + class_names,
                    color=colors + colors,
                    customdata=custom_data,
                    hovertemplate="%{label} is confused with"
                    " %{customdata} classes.<extra></extra>",
                ),
                link=dict(
                    source=source,  # indices correspond to labels, eg A1, A2, A2, B1, ...
                    target=target,
                    value=value,
                    color=[to_rgba_pl(colors[i], 0.5) for i in source],
                    customdata=similarity,
                    hovertemplate="%{source.label}<>%{target.label}:"
                    " %{customdata} <extra></extra>",
                ),
            )
        ]
    )

    fig.update_layout(
        title_text=dataset_manager.config.name,
        font_size=10,
        autosize=False,
        width=700,
        height=1000,
        margin=dict(l=0, r=0, b=100, t=100, pad=4),
    )
    return PlotSpecification(**json.loads(fig.to_json()))
