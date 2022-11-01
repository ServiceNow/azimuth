import json
import math
from itertools import cycle
from typing import List, Optional, Tuple

import numpy as np
from matplotlib.colors import to_rgb
from plotly import graph_objects as go

from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.modules.dataset_analysis.class_overlap import take
from azimuth.types import PlotSpecification
from azimuth.types.class_overlap import ClassOverlapPlotResponse, ClassOverlapResponse
from azimuth.utils.plots import AXIS_FONT_SIZE, SANKEY_PALETTE


def make_sankey_plot(
    response: ClassOverlapResponse,
    dataset_manager: DatasetSplitManager,
    self_overlap: bool = False,
    scale_by_class: bool = True,
    overlap_threshold: Optional[float] = None,
) -> ClassOverlapPlotResponse:
    """
    Plot the result of SpectralClusteringResponse (S-matrix) as a Sankey plot
        with nodes ordered by S-matrix overlap.

    Args:
        response: Result of `compute_on_dataset_split`
        dataset_manager: One dataset manager
        self_overlap: Plot flow when class i == class j?
        scale_by_class: Scale nodes/flow to size of class i?
        overlap_threshold: Overlap threshold below which flow/overlap is not plotted. When set to
            None, threshold is determined automatically to tenth highest overlap value.

    Returns:
        Sankey plot showing the similarity/overlap between classes
        Overlap threshold used in plot (as input or calculated by default)
        Default overlap threshold
    """
    node_padding = 4
    plot_height = 1000
    top_margin = 4
    bottom_margin = 4

    def to_rgba_pl(col, alpha):
        rgb = to_rgb(col)
        r, g, b = [int(c * 255) for c in rgb]
        return f"rgba({r},{g},{b},{alpha})"

    source, target, value, similarity = [], [], [], []

    sim: np.ndarray = response.s_matrix  # similarity matrix
    sim_shape: int = sim.shape[0]
    class_names = dataset_manager.get_class_names(labels_only=True)[:sim_shape]
    class_counts = dataset_manager.class_distribution()
    colors = take(cycle(SANKEY_PALETTE), sim_shape)

    sim_array = [(index[0], index[1], value) for index, value in np.ndenumerate(sim)]
    sim_array_sorted: List[Tuple[int, int, float]] = sorted(
        sim_array, key=lambda x: x[2], reverse=True
    )  # includes i==j
    sim_array_nonself_sorted = [i for i in sim_array_sorted if i[0] != i[1]]  # drops i==j

    # Determine threshold algorithmically to show 10 overlapping pairs
    pairs_to_show = min(len(sim_array_nonself_sorted), 10)
    default_overlap_threshold = (
        math.floor(sim_array_nonself_sorted[pairs_to_show - 1][2] * 100) / 100
    )
    if overlap_threshold is None:
        overlap_threshold = default_overlap_threshold

    sim_values = sim_array_sorted if self_overlap else sim_array_nonself_sorted
    class_mass_i = np.zeros(sim_shape)
    class_mass_j = np.zeros(sim_shape)
    for i, j, sim_value in sim_values:
        if sim_value < overlap_threshold:
            continue
        j_index = j + sim_shape
        source.append(i)
        target.append(j_index)
        val = sim_value * class_counts[i] if scale_by_class else sim_value
        value.append(val)
        similarity.append(sim_value)
        class_mass_i[i] += val
        class_mass_j[j] += val

    # Find y-positions for nodes, ordered by s-matrix overlap
    # Order of nodes on plot (some nodes do not exist because sim_value < threshold)
    # ordered set: https://www.peterbe.com/plog/fastest-way-to-uniquify-a-list-in-python-3.6
    order_i_all = list(dict.fromkeys([item[0] for item in sim_array_nonself_sorted]))
    order_j_all = list(dict.fromkeys([item[1] for item in sim_array_nonself_sorted]))
    plotted_nodes_i = sorted(set(source))  # Ordered numerically
    plotted_nodes_j = np.array(sorted(set(target))) - sim_shape  # Ordered numerically
    order_i = [c for c in order_i_all if c in plotted_nodes_i]  # Reorder to plotted order
    order_j = [c for c in order_j_all if c in plotted_nodes_j]  # Reorder to plotted order
    node_prop = (
        plot_height - (top_margin + bottom_margin + node_padding * (len(order_i) - 1))
    ) / plot_height  # Take plotted node spacing into account
    # Class masses in plotted order (top to bottom); sum to node_prop_of_plot for finding positions
    ordered_class_mass_norm_i = class_mass_i[order_i] / class_mass_i[order_i].sum() * node_prop
    ordered_class_mass_norm_j = class_mass_j[order_j] / class_mass_j[order_j].sum() * node_prop
    # Find positions for node centers; node bottom - half node height (plotted order) + padding
    padding_i = (top_margin / plot_height) + np.array(range(len(order_i))) * (
        node_padding / plot_height
    )
    padding_j = (top_margin / plot_height) + np.array(range(len(order_j))) * (
        node_padding / plot_height
    )
    ordered_y_positions_i = (
        np.cumsum(ordered_class_mass_norm_i) - ordered_class_mass_norm_i * 0.5 + padding_i
    )
    ordered_y_positions_j = (
        np.cumsum(ordered_class_mass_norm_j) - ordered_class_mass_norm_j * 0.5 + padding_j
    )
    # Re-order to node index order (numerical)
    positions_y_i = [ordered_y_positions_i[order_i.index(i)] for i in plotted_nodes_i]
    positions_y_j = [ordered_y_positions_j[order_j.index(i)] for i in plotted_nodes_j]
    positions_y = positions_y_i + positions_y_j

    # x-positions like [0, 0, 0 ... 1, 1, 1]; Sankey plot needs values >0 and <1
    positions_x = [0.001] * len(plotted_nodes_i) + [0.999] * len(plotted_nodes_j)

    # For hover data (overlap info determined by threshold, so aligned with plotted data)
    higher_than_thresh = sim >= overlap_threshold
    np.fill_diagonal(higher_than_thresh, 0)
    custom_data_i = higher_than_thresh.sum(-1).tolist()
    custom_data_j = higher_than_thresh.sum(0).tolist()
    custom_data = [
        f"overlaps {i} class{'es' if i != 1 else ''} (over threshold)" for i in custom_data_i
    ] + [
        f"is overlapped by {i} class{'es' if i != 1 else ''} (over threshold)"
        for i in custom_data_j
    ]
    fig = go.Figure(
        data=[
            go.Sankey(
                arrangement="snap",
                node=dict(
                    x=positions_x,
                    y=positions_y,
                    pad=node_padding,
                    thickness=20,
                    label=class_names + class_names,
                    color=colors + colors,
                    customdata=custom_data,
                    hovertemplate="%{label} %{customdata} <extra></extra>",
                ),
                link=dict(
                    source=source,  # indices correspond to labels, eg A1, A2, A2, B1, ...
                    target=target,
                    value=value,
                    color=[to_rgba_pl(colors[i], 0.5) for i in source],
                    customdata=similarity,
                    hovertemplate="%{source.label}<>%{target.label}:"
                    " %{customdata:.3f} <extra></extra>",
                ),
            )
        ]
    )

    fig.update_layout(
        font_size=AXIS_FONT_SIZE,
        autosize=False,
        width=700,
        height=plot_height,
        margin=dict(l=0, r=0, b=bottom_margin, t=top_margin, pad=node_padding),
    )
    return ClassOverlapPlotResponse(
        plot=PlotSpecification(**json.loads(fig.to_json())),
        default_overlap_threshold=default_overlap_threshold,
    )
