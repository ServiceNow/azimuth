# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
import json
from typing import Dict, List, Optional, cast

import numpy as np
import plotly.graph_objs as go
from plotly.subplots import make_subplots

from azimuth.types import DatasetSplitName, PlotSpecification
from azimuth.types.dataset_warnings import Agg, DatasetWarningPlots
from azimuth.utils.plots import (
    AXIS_FONT_SIZE,
    DATASET_SPLIT_COLORS,
    DATASET_SPLIT_OFFSETS,
    DATASET_SPLIT_PRETTY_NAMES,
    X_LEFT_LEGEND,
    X_RIGHT_LEGEND,
    Y_LEGEND_LINE_1,
    Y_LEGEND_LINE_HEIGHT,
    Colors,
    fig_default,
    plot_height_based_on_cls_count,
    shorten_cls_names,
)


def sample_count_plot(
    count_per_cls_per_split: Dict[DatasetSplitName, np.ndarray],
    alert_per_cls_per_split: Dict[DatasetSplitName, List[bool]],
    cls_names: List[str],
):
    """Generate the figure with the number of samples per class.

    Args:
        count_per_cls_per_split: Sample count per class per split.
        alert_per_cls_per_split: Indicator if there is an alert per class per split.
        cls_names: Class names.

    Returns:
        Plot.

    """

    cls_names = shorten_cls_names(cls_names)
    order = count_per_cls_per_split[DatasetSplitName.eval].argsort()

    fig = go.Figure()
    for split, count in sorted(count_per_cls_per_split.items()):
        fig.add_bar(
            y=[cls_names[x] for x in order],
            x=count[order],
            name=DATASET_SPLIT_PRETTY_NAMES[split],
            offset=DATASET_SPLIT_OFFSETS[split],
            marker=dict(color=DATASET_SPLIT_COLORS[split]),
        )

    fig.update_traces(orientation="h", width=0.4)

    fig.update_layout(
        title="Number of samples per class in both sets",
        height=plot_height_based_on_cls_count(len(cls_names)),
    )

    fig.update_xaxes(
        zeroline=True,
        zerolinecolor=Colors.Axis,
        zerolinewidth=1,
        showgrid=True,
        gridcolor=Colors.Gray_transparent,
    )
    fig.update_yaxes(ticks="outside", ticklen=24, tickcolor="white")

    # Generate warning indicators on the left axis
    alert_text_per_split = {DatasetSplitName.eval: "◓", DatasetSplitName.train: "◒"}
    common_args = dict(
        xref="paper",
        showarrow=False,
        x=-0.037,
        font=dict(color=Colors.Orange, size=AXIS_FONT_SIZE),
    )
    for split, alert in alert_per_cls_per_split.items():
        for idx, cls in enumerate(order):
            if alert[cls]:
                fig.add_annotation(text=alert_text_per_split[split], y=idx, **common_args)

    y_legend_1 = Y_LEGEND_LINE_1 + 3 * Y_LEGEND_LINE_HEIGHT
    y_legend_2 = Y_LEGEND_LINE_1 + 4 * Y_LEGEND_LINE_HEIGHT
    y_legend_3 = Y_LEGEND_LINE_1 + 5 * Y_LEGEND_LINE_HEIGHT
    y_legend_4 = Y_LEGEND_LINE_1 + 6 * Y_LEGEND_LINE_HEIGHT

    common_args = dict(
        y=1,
        xref="paper",
        yref="paper",
        xanchor="left",
        yanchor="middle",
        showarrow=False,
    )

    for y in [y_legend_2, y_legend_4]:
        fig.add_annotation(
            x=X_LEFT_LEGEND,
            yshift=y,
            text=alert_text_per_split[DatasetSplitName.eval],
            font=dict(color=Colors.Orange),
            **common_args,
        )
    for y in [y_legend_3, y_legend_4]:
        fig.add_annotation(
            x=X_LEFT_LEGEND,
            yshift=y,
            text=alert_text_per_split[DatasetSplitName.train],
            font=dict(color=Colors.Orange),
            **common_args,
        )

    fig.add_annotation(
        x=X_LEFT_LEGEND,
        yshift=y_legend_1,
        text="Warning due to:",
        **common_args,
    )
    for y, text in zip(
        [y_legend_2, y_legend_3, y_legend_4],
        [
            DATASET_SPLIT_PRETTY_NAMES[DatasetSplitName.eval],
            DATASET_SPLIT_PRETTY_NAMES[DatasetSplitName.train],
            "both sets",
        ],
    ):
        fig.add_annotation(
            x=X_RIGHT_LEGEND,
            yshift=y,
            text=text,
            **common_args,
        )

    fig = fig_default(fig)
    return fig


def min_sample_count_plot(
    count_per_cls_per_split: Dict[DatasetSplitName, np.ndarray],
    threshold: int,
    alert_per_cls_per_split: Dict[DatasetSplitName, List[bool]],
    cls_names: List[str],
) -> DatasetWarningPlots:
    """Generate the plot for the minimal number of samples per class.

    Args:
        count_per_cls_per_split: Sample count per class per split.
        threshold: Threshold below which a class has an associated alert.
        alert_per_cls_per_split: Indicator if there is an alert per class per split.
        cls_names: Class names.

    Returns:
        Plot.

    """
    fig = sample_count_plot(count_per_cls_per_split, alert_per_cls_per_split, cls_names)
    fig.add_vline(x=threshold, line_width=1, line_dash="dot", line_color=Colors.Orange)
    fig.add_annotation(
        text=threshold,
        x=threshold,
        y=1.002,
        yanchor="bottom",
        yref="paper",
        font=dict(color=Colors.Orange),
        showarrow=False,
    )

    return DatasetWarningPlots(overall=json.loads(fig.to_json()), per_class=None)


def class_imbalance_plot(
    count_per_cls_per_split: Dict[DatasetSplitName, np.ndarray],
    mean_per_split: Dict[DatasetSplitName, float],
    max_perc_delta: float,
    alert_per_cls_per_split: Dict[DatasetSplitName, List[bool]],
    cls_names: List[str],
) -> DatasetWarningPlots:
    """Generate the plot for the class imbalance warnings.

    Args:
        count_per_cls_per_split: Sample count per class per split.
        mean_per_split: Mean of the sample count per split.
        max_perc_delta: Percentage around the mean where values need to be.
        alert_per_cls_per_split: Indicator if there is an alert per class per split.
        cls_names: Class names.

    Returns:
        Plot.

    """
    fig = sample_count_plot(count_per_cls_per_split, alert_per_cls_per_split, cls_names)

    common_args = dict(layer="below", line_width=1, y0=-1)
    cls_count = len(cls_names)
    y1_per_split = {DatasetSplitName.eval: cls_count + 2, DatasetSplitName.train: cls_count + 1}
    for split, mean in sorted(mean_per_split.items()):
        fig.add_shape(
            x0=mean * (1 - max_perc_delta),
            x1=mean * (1 + max_perc_delta),
            y1=y1_per_split[split],
            line_color=DATASET_SPLIT_COLORS[split],
            fillcolor=DATASET_SPLIT_COLORS[split],
            type="rect",
            opacity=0.3,
            **common_args,
        )
        fig.add_shape(
            x0=mean,
            x1=mean,
            y1=y1_per_split[split],
            line_color=DATASET_SPLIT_COLORS[split],
            type="line",
            line_dash="dot",
            **common_args,
        )
        fig.add_annotation(
            text=f"Mean in {split}: {mean:.2f}",
            x=mean,
            y=y1_per_split[split],
            yanchor="top",
            font=dict(color=Colors.Text),
            showarrow=False,
        )

    return DatasetWarningPlots(overall=json.loads(fig.to_json()), per_class=None)


def class_representation(
    count_per_cls_per_split: Dict[DatasetSplitName, np.ndarray],
    count_norm_per_cls_per_split: Dict[DatasetSplitName, np.ndarray],
    divergence_norm: np.ndarray,
    threshold: float,
    cls_names: List[str],
) -> DatasetWarningPlots:
    """Generate the plot for the minimal representation of samples per class.

    Args:
        count_per_cls_per_split: Sample count per class per split.
        count_norm_per_cls_per_split: Normalized sample count per class per split.
        divergence_norm: Difference in percentage per class between train and eval.
        threshold: Threshold below which a class has an associated alert.
        cls_names: Class names.

    Returns:
        Plot.

    """
    order = divergence_norm.argsort()
    cls_names = shorten_cls_names(cls_names)

    fig = make_subplots(rows=1, cols=2, column_widths=[0.3, 0.7])

    for split, c_norm in sorted(count_norm_per_cls_per_split.items()):
        fig.add_bar(
            y=[cls_names[x] for x in order],
            x=c_norm,
            text=count_per_cls_per_split[split][order],
            name=DATASET_SPLIT_PRETTY_NAMES[split],
            xaxis="x2",
            hoverinfo="x+y+text",
            width=0.4,
            offset=DATASET_SPLIT_OFFSETS[split],
            marker=dict(color=DATASET_SPLIT_COLORS[split]),
        )

    fig.add_bar(
        y=[cls_names[x] for x in order],
        x=divergence_norm[order],
        marker=dict(
            color=[
                Colors.Axis if (x <= threshold) and (x >= -threshold) else Colors.Orange
                for x in divergence_norm[order]
            ]
        ),
        name="delta",
        xaxis="x1",
    )

    for mult in [-1, 1]:
        fig.add_vline(
            x=mult * threshold,
            line_width=1,
            line_dash="dot",
            line_color=Colors.Orange,
            col=1,
            row=1,
        )
        # These transparent lines make sure that the left plot is centered and with a min. range.
        fig.add_vline(x=mult * 0.2, line_color="rgba(0,0,0,0)", col=1, row=1)

    fig.add_annotation(
        text=f"±{100 * threshold}%",
        x=0,
        y=1.002,
        yanchor="bottom",
        yref="paper",
        font=dict(color=Colors.Orange),
        showarrow=False,
    )

    for idx, cls in enumerate(order):
        if divergence_norm[cls] > threshold or divergence_norm[cls] < -threshold:
            fig.add_annotation(
                text="⬤",
                font=dict(color=Colors.Orange, size=AXIS_FONT_SIZE - 3),
                x=-0.02,
                xref="paper",
                y=idx,
                showarrow=False,
            )

    y_legend = Y_LEGEND_LINE_1 + 3 * Y_LEGEND_LINE_HEIGHT

    common_args = dict(
        y=1,
        xref="paper",
        yref="paper",
        xanchor="left",
        yanchor="middle",
        showarrow=False,
        yshift=y_legend,
    )

    fig.add_annotation(
        x=X_LEFT_LEGEND,
        text="⬤",
        font=dict(color=Colors.Orange, size=AXIS_FONT_SIZE - 3),
        **common_args,
    )
    fig.add_annotation(
        x=X_RIGHT_LEGEND,
        text="warning",
        font=dict(color=Colors.Text, size=AXIS_FONT_SIZE),
        **common_args,
    )

    fig.update_traces(orientation="h")
    fig.update_layout(
        title="Delta in class representation between both sets",
        height=plot_height_based_on_cls_count(len(cls_names)),
    )
    fig.update_xaxes(
        tickformat=",.0%",
        zeroline=True,
        zerolinecolor=Colors.Axis,
        zerolinewidth=1,
        showgrid=True,
        gridcolor=Colors.Gray_transparent,
    )
    fig = fig_default(fig)
    fig.update_yaxes(ticks="outside", ticklen=15, tickcolor="white")  # Override default

    return DatasetWarningPlots(overall=json.loads(fig.to_json()), per_class=None)


def create_histogram_mean_std(
    hist_per_split: Dict[DatasetSplitName, np.ndarray],
    value_per_agg_per_split: Dict[DatasetSplitName, Dict[Agg, float]],
    divergence_per_agg: Optional[Dict[Agg, float]] = None,
) -> PlotSpecification:
    """Create the histogram traces and annotations for each class (and "all").

    Args:
        hist_per_split: Histogram values for the selected class per split.
        value_per_agg_per_split: Mean and std dev for the selected class per split.
        divergence_per_agg: Difference in the mean and std dev. None means that we are generating
            the plot for 'all' classes.

    Returns:
        Plot for one class.

    """
    fig = go.Figure()

    hist_normalized = {
        split: hist / sum(hist) for split, hist in hist_per_split.items() if any(hist)
    }

    # Helps position the error bars.
    max_y = max((value.max() for value in hist_normalized.values()), default=0)

    y_per_split = {DatasetSplitName.eval: 1.14, DatasetSplitName.train: 1.07}
    opacity_per_split = {DatasetSplitName.eval: 1, DatasetSplitName.train: 0.5}
    # sorted because the color overlay looks better when eval is first
    for split, hist in sorted(hist_normalized.items()):
        fig.add_bar(
            x=list(range(1, len(hist) + 1)),
            y=hist,
            name=DATASET_SPLIT_PRETTY_NAMES[split],
            marker=dict(color=DATASET_SPLIT_COLORS[split], opacity=opacity_per_split[split]),
        )

        fig.add_scatter(
            x=[np.round(value_per_agg_per_split[split][Agg.mean], 2)],
            y=[max_y * y_per_split[split]],
            name=f"{split}_mean_std",
            error_x=dict(
                type="constant", value=np.round(value_per_agg_per_split[split][Agg.std], 2)
            ),
            hoverinfo="x",
            marker=dict(color=DATASET_SPLIT_COLORS[split]),
        )

    if divergence_per_agg and len(hist_normalized) == 2:
        fig.add_annotation(
            x=0,
            y=max_y * 1.2,
            text=f"Delta of {divergence_per_agg[Agg.mean]:.2f}±"
            f"{divergence_per_agg[Agg.std]:.2f} tokens",
            font=dict(color=Colors.Text),
            xref="paper",
            xanchor="left",
            showarrow=False,
        )

    if len(hist_normalized) == 0:
        fig.add_annotation(
            x=0.5,
            y=0.5,
            text="No utterances for this class",
            font=dict(color=Colors.Text, size=AXIS_FONT_SIZE),
            xref="paper",
            xanchor="center",
            yref="paper",
            yanchor="middle",
            showarrow=False,
        )

    fig.update_layout(
        barmode="overlay",
        title="Histogram of utterances per word count",
        height=500,
    )
    fig.update_yaxes(
        tickformat=",.0%",
        zerolinecolor=Colors.Axis,
        zerolinewidth=1,
        showgrid=True,
        gridcolor=Colors.Gray_transparent,
        tickmode="array",
        tickvals=np.arange(0, max_y, 0.05),
    )
    fig.update_xaxes(zeroline=True, zerolinecolor=Colors.Axis, zerolinewidth=1)
    fig = fig_default(fig)
    fig.update_layout(margin=dict(l=60))  # Overwriting default for this plot

    return cast(PlotSpecification, json.loads(fig.to_json()))


def word_count_plot(
    hist_per_cls_per_split: Dict[DatasetSplitName, np.ndarray],
    value_per_agg_per_split: Dict[DatasetSplitName, Dict[Agg, float]],
    value_per_cls_per_agg_per_split: Dict[DatasetSplitName, Dict[Agg, np.ndarray]],
    divergence_per_cls_per_agg: Dict[Agg, np.ndarray],
    cls_names: List[str],
) -> DatasetWarningPlots:
    """Create the plot with the dropdown for all classes.

    Args:
        hist_per_cls_per_split: Histogram of word count per class per split.
        value_per_agg_per_split: Mean and std dev per split.
        value_per_cls_per_agg_per_split: Mean and std dev per class per split.
        divergence_per_cls_per_agg: Alert value for the mean and std dev per class.
        cls_names: List of class names.

    Returns:
        Plot for all classes combined, and plot per class.

    """
    # Sanitize values for the plot.
    sanitized_value_per_cls_per_agg_per_split = {
        split: {agg: np.nan_to_num(value) for agg, value in per_split_value.items()}
        for split, per_split_value in value_per_cls_per_agg_per_split.items()
    }

    hist_per_split = {split: h.sum(axis=0) for split, h in hist_per_cls_per_split.items()}

    # Traces and Annotations across all classes
    fig_all = create_histogram_mean_std(
        hist_per_split,
        value_per_agg_per_split,
    )

    # Traces and Annotations for each class
    figs_dict = {}
    for cls_id in np.arange(len(cls_names)):
        figs_dict[cls_names[cls_id]] = create_histogram_mean_std(
            {split: value[cls_id] for split, value in hist_per_cls_per_split.items()},
            {
                split: {agg: value[cls_id] for agg, value in per_split_value.items()}
                for split, per_split_value in sanitized_value_per_cls_per_agg_per_split.items()
            },
            {agg: value[cls_id] for agg, value in divergence_per_cls_per_agg.items()},
        )

    return DatasetWarningPlots(overall=fig_all, per_class=figs_dict)
