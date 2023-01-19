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
    DATASET_SPLIT_PRETTY_NAMES,
    PAPER_MARGINS,
    X_LEFT_LEGEND,
    X_RIGHT_LEGEND,
    Y_LEGEND_LINE_1,
    Y_LEGEND_LINE_HEIGHT,
    Colors,
    fig_default,
    shorten_cls_names,
)


def nb_samples_plot(
    train_nb_sample: np.ndarray,
    eval_nb_sample: np.ndarray,
    alert_train: List[bool],
    alert_eval: List[bool],
    cls_names: List[str],
    order: np.ndarray,
):
    """Generate the figure with the number of samples per label.

    Args:
        train_nb_sample: Distribution of the nb of samples per label in the training set.
        eval_nb_sample:  Distribution of the nb of samples per label in the eval set.
        alert_train: Indicator if there is an alert per label in the training set.
        alert_eval: Indicator if there is an alert per label in the evaluation set.
        cls_names: Class names.
        order: Display order of the class indices

    Returns:
        Plot.

    """

    cls_names = shorten_cls_names(cls_names)

    fig = go.Figure()

    fig.add_bar(
        y=[cls_names[x] for x in order],
        x=eval_nb_sample[order],
        name="evaluation set",
        width=0.4,
        offset=0,
    )

    fig.add_bar(
        y=[cls_names[x] for x in order],
        x=train_nb_sample[order],
        name="training set",
        width=0.4,
        offset=-0.4,
    )

    fig.update_traces(orientation="h")

    fig.update_layout(
        title="Number of samples per class in both sets",
        height=PAPER_MARGINS["t"] + PAPER_MARGINS["b"] + max(len(train_nb_sample), 6) * 23,
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
    x_warning = -0.037
    for idx, label in enumerate(order):
        common_args = dict(
            xref="paper",
            showarrow=False,
            x=x_warning,
            y=idx,
            font=dict(color=Colors.Orange, size=AXIS_FONT_SIZE),
        )
        if alert_train[label]:
            fig.add_annotation(text="◒", **common_args)
        if alert_eval[label]:
            fig.add_annotation(text="◓", **common_args)

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

    fig.add_annotation(
        x=X_LEFT_LEGEND,
        yshift=y_legend_2,
        text="◓",
        font=dict(color=Colors.Orange),
        **common_args,
    )
    fig.add_annotation(
        x=X_LEFT_LEGEND,
        yshift=y_legend_3,
        text="◒",
        font=dict(color=Colors.Orange),
        **common_args,
    )
    fig.add_annotation(
        x=X_LEFT_LEGEND,
        yshift=y_legend_4,
        text="◓",
        font=dict(color=Colors.Orange),
        **common_args,
    )
    fig.add_annotation(
        x=X_LEFT_LEGEND,
        yshift=y_legend_4,
        text="◒",
        font=dict(color=Colors.Orange),
        **common_args,
    )
    fig.add_annotation(
        x=X_LEFT_LEGEND,
        yshift=y_legend_1,
        text="Warning due to:",
        **common_args,
    )
    fig.add_annotation(
        x=X_RIGHT_LEGEND,
        yshift=y_legend_2,
        text="evaluation set",
        **common_args,
    )
    fig.add_annotation(
        x=X_RIGHT_LEGEND,
        yshift=y_legend_3,
        text="training set",
        **common_args,
    )
    fig.add_annotation(
        x=X_RIGHT_LEGEND,
        yshift=y_legend_4,
        text="both sets",
        **common_args,
    )

    fig = fig_default(fig)
    return fig


def min_nb_samples_plot(
    train_nb_sample: np.ndarray,
    eval_nb_sample: np.ndarray,
    threshold: int,
    alert_train: List[bool],
    alert_eval: List[bool],
    cls_names: List[str],
) -> DatasetWarningPlots:
    """Generate the plot for the minimal number of samples per label.

    Args:
        train_nb_sample: Distribution of the nb of samples per label in the training set.
        eval_nb_sample:  Distribution of the nb of samples per label in the eval set.
        threshold: Threshold below which a label has an associated alert.
        alert_train: Indicator if there is an alert per label in the training set.
        alert_eval: Indicator if there is an alert per label in the evaluation set.
        cls_names: Class names.

    Returns:
        Plot.

    """
    order = eval_nb_sample.argsort()

    fig = nb_samples_plot(
        train_nb_sample, eval_nb_sample, alert_train, alert_eval, cls_names, order
    )
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
    train_nb_sample: np.ndarray,
    eval_nb_sample: np.ndarray,
    train_mean: float,
    eval_mean: float,
    max_perc_delta: float,
    alert_train: List[bool],
    alert_eval: List[bool],
    cls_names: List[str],
) -> DatasetWarningPlots:
    """Generate the plot for the class imbalance warnings.

    Args:
        train_nb_sample: Distribution of the number of samples per label in the training set.
        eval_nb_sample:  Distribution of the number of samples per label in the eval set.
        train_mean: Mean of the number of samples in the training set.
        eval_mean: Mean of the number of samples in the evaluation set.
        max_perc_delta: Percentage around the mean where values need to be.
        alert_train: Indicator if there is an alert per label in the training set.
        alert_eval: Indicator if there is an alert per label in the evaluation set.
        cls_names: Class names.

    Returns:
        Plot.

    """
    order = eval_nb_sample.argsort()

    fig = nb_samples_plot(
        train_nb_sample, eval_nb_sample, alert_train, alert_eval, cls_names, order
    )
    num_classes = len(cls_names)
    y1_eval = num_classes + 2
    y1_train = num_classes + 1
    common_args = dict(layer="below", line_width=1, y0=-1)
    common_args_rect = dict(type="rect", opacity=0.3, **common_args)
    fig.add_shape(
        x0=eval_mean * (1 - max_perc_delta),
        x1=eval_mean * (1 + max_perc_delta),
        y1=y1_eval,
        line_color=Colors.DataViz1,
        fillcolor=Colors.DataViz1,
        **common_args_rect,
    )
    fig.add_shape(
        x0=train_mean * (1 - max_perc_delta),
        x1=train_mean * (1 + max_perc_delta),
        y1=y1_train,
        line_color=Colors.DataViz2,
        fillcolor=Colors.DataViz2,
        **common_args_rect,
    )
    common_args_line = dict(type="line", line_dash="dot", **common_args)
    fig.add_shape(
        x0=eval_mean,
        x1=eval_mean,
        y1=y1_eval,
        line_color=Colors.DataViz1,
        **common_args_line,
    )
    fig.add_shape(
        x0=train_mean,
        x1=train_mean,
        y1=y1_train,
        line_color=Colors.DataViz2,
        **common_args_line,
    )
    common_args_ann = dict(yanchor="top", font=dict(color=Colors.Text), showarrow=False)
    fig.add_annotation(
        text=f"Mean in eval: {eval_mean:.2f}", x=eval_mean, y=y1_eval, **common_args_ann
    )
    fig.add_annotation(
        text=f"Mean in train: {train_mean:.2f}", x=train_mean, y=y1_train, **common_args_ann
    )

    return DatasetWarningPlots(overall=json.loads(fig.to_json()), per_class=None)


def class_representation(
    train_nb_sample: np.ndarray,
    eval_nb_sample: np.ndarray,
    train_dist_norm: np.ndarray,
    eval_dist_norm: np.ndarray,
    divergence_norm: np.ndarray,
    threshold: float,
    cls_names: List[str],
) -> DatasetWarningPlots:
    """Generate the plot for the minimal representation of samples per label.

    Args:
        train_nb_sample: Distribution of the nb of samples per label in the training set.
        eval_nb_sample: Distribution of the nb of samples per label in the eval set.
        train_dist_norm: Distribution of the percentage of samples per label in the training set.
        eval_dist_norm: Distribution of the percentage of samples per label in the eval set.
        divergence_norm: Difference in percentage per label between train and eval.
        threshold: Threshold below which a label has an associated alert.
        cls_names: Class names.

    Returns:
        Plot.

    """
    order = divergence_norm.argsort()
    cls_names = shorten_cls_names(cls_names)

    fig = make_subplots(rows=1, cols=2, column_widths=[0.3, 0.7])

    fig.add_bar(
        y=[cls_names[x] for x in order],
        x=eval_dist_norm[order],
        text=eval_nb_sample[order],
        name="evaluation set",
        xaxis="x2",
        hoverinfo="x+y+text",
        width=0.4,
        offset=0,
    )

    fig.add_bar(
        y=[cls_names[x] for x in order],
        x=train_dist_norm[order],
        text=train_nb_sample[order],
        name="training set",
        xaxis="x2",
        hoverinfo="x+y+text",
        width=0.4,
        offset=-0.4,
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

    fig.update_traces(orientation="h")

    fig.update_layout(
        title="Delta in class representation between both sets",
        height=PAPER_MARGINS["t"] + PAPER_MARGINS["b"] + max(len(train_nb_sample), 6) * 23,
    )

    fig.update_xaxes(
        tickformat=",.0%",
        zeroline=True,
        zerolinecolor=Colors.Axis,
        zerolinewidth=1,
        showgrid=True,
        gridcolor=Colors.Gray_transparent,
    )

    fig.add_vline(
        x=threshold, line_width=1, line_dash="dot", line_color=Colors.Orange, col=1, row=1
    )
    fig.add_vline(
        x=-threshold, line_width=1, line_dash="dot", line_color=Colors.Orange, col=1, row=1
    )

    fig.add_annotation(
        text=f"±{100 * threshold}%",
        x=0,
        y=1.002,
        yanchor="bottom",
        yref="paper",
        font=dict(color=Colors.Orange),
        showarrow=False,
    )

    # These transparent lines make sure that the left plot is centered and with a min. range.
    fig.add_vline(x=-0.2, line_color="rgba(0,0,0,0)", col=1, row=1)
    fig.add_vline(x=0.2, line_color="rgba(0,0,0,0)", col=1, row=1)

    for idx, label in enumerate(order):
        if divergence_norm[label] > threshold or divergence_norm[label] < -threshold:
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
    )

    fig.add_annotation(
        x=X_LEFT_LEGEND,
        yshift=y_legend,
        text="⬤",
        font=dict(color=Colors.Orange, size=AXIS_FONT_SIZE - 3),
        **common_args,
    )
    fig.add_annotation(
        x=X_RIGHT_LEGEND,
        yshift=y_legend,
        text="warning",
        font=dict(color=Colors.Text, size=AXIS_FONT_SIZE),
        **common_args,
    )

    fig = fig_default(fig)
    fig.update_yaxes(ticks="outside", ticklen=15, tickcolor="white")

    return DatasetWarningPlots(overall=json.loads(fig.to_json()), per_class=None)


def create_histogram_mean_std(
    hist_per_split: Dict[DatasetSplitName, np.ndarray],
    value_per_agg_per_split: Dict[DatasetSplitName, Dict[Agg, float]],
    divergence_per_agg: Optional[Dict[Agg, float]] = None,
) -> PlotSpecification:
    """Create the histogram traces and annotations for each label (and "all").

    Args:
        hist_per_split: Histogram values for the selected label per split.
        value_per_agg_per_split: Mean and std dev for the selected label per split.
        divergence_per_agg: Difference in the mean and std dev. None means that we are generating
            the plot for 'all' labels.

    Returns:
        Plot for one label.

    """
    fig = go.Figure()

    hist_normalized = {split: hist / max(sum(hist), 1) for split, hist in hist_per_split.items()}

    # Helps position the error bars.
    max_y = max(value.max() for value in hist_normalized.values())

    y_per_split = {DatasetSplitName.eval: 1.14, DatasetSplitName.train: 1.07}
    opacity_per_split = {DatasetSplitName.eval: 1, DatasetSplitName.train: 0.5}
    # reversed because the color overlay looks better when train is first
    for split, hist in reversed(hist_normalized.items()):
        if hist.max() != 0:
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

    two_distributions = all(any(value > 0 for value in h) for h in hist_normalized.values())

    if divergence_per_agg and two_distributions:
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

    empty_distribution = max(value.max() for value in hist_normalized.values()) == 0
    if empty_distribution:
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
    hist_per_label_per_split: Dict[DatasetSplitName, np.ndarray],
    value_per_agg_per_split: Dict[DatasetSplitName, Dict[Agg, float]],
    value_per_label_per_agg_per_split: Dict[DatasetSplitName, Dict[Agg, np.ndarray]],
    divergence_per_label_per_agg: Dict[Agg, np.ndarray],
    class_names: List[str],
) -> DatasetWarningPlots:
    """Create the plot with the dropdown for all labels.

    Args:
        hist_per_label_per_split: Histogram of word count per label per split.
        value_per_agg_per_split: Mean and std dev per split.
        value_per_label_per_agg_per_split: Mean and std dev per label per split.
        divergence_per_label_per_agg: Alert value for the mean and std dev per label.
        class_names: List of class names.

    Returns:
        Plot for all classes combined, and plot per class.

    """
    # Sanitize values for the plot.
    sanitized_value_per_label_per_agg_per_split = {
        split: {agg: np.nan_to_num(value) for agg, value in per_split_value.items()}
        for split, per_split_value in value_per_label_per_agg_per_split.items()
    }

    hist_per_split = {split: h.sum(axis=0) for split, h in hist_per_label_per_split.items()}

    # Traces and Annotations across all labels
    fig_all = create_histogram_mean_std(
        hist_per_split,
        value_per_agg_per_split,
    )

    # Traces and Annotations for each label
    figs_dict = {}
    for label_id in np.arange(len(class_names)):
        figs_dict[class_names[label_id]] = create_histogram_mean_std(
            {split: value[label_id] for split, value in hist_per_label_per_split.items()},
            {
                split: {agg: value[label_id] for agg, value in per_split_value.items()}
                for split, per_split_value in sanitized_value_per_label_per_agg_per_split.items()
            },
            {agg: value[label_id] for agg, value in divergence_per_label_per_agg.items()},
        )

    return DatasetWarningPlots(overall=fig_all, per_class=figs_dict)
