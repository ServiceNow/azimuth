# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import List

import numpy as np
from plotly import graph_objs as go
from plotly.subplots import make_subplots

from azimuth.utils.plots import Colors


def make_ece_figure(
    accuracy: np.ndarray, expected: np.ndarray, ece: float, count: List[int]
) -> go.Figure:
    """Create an ECE Figure from the computed data.

    Notes:
        The expected accuracy in this plot does not exactly match the ECE formula, which uses the
        mean confidence. It instead uses the mid confidence per bin, which gives an idea of the
        expected accuracy even for empty bins.

    Args:
        accuracy: Accuracy for each bin
        expected: Expected accuracy for each bin
        ece: ECE value.
        count: Count for each bin.

    Returns:
        Plotly figure of the ECE.

    """
    accuracy_filtered = [None if count[i] == 0 else acc for i, acc in enumerate(accuracy)]
    fig = make_subplots(
        rows=2,
        cols=1,
        shared_xaxes=True,
        vertical_spacing=0.1,
        specs=[[{"type": "scatter"}], [{"type": "scatter"}]],
        row_width=[0.2, 0.8],
    )
    fig.add_bar(x=expected, y=count, name="Count", row=2, col=1)
    fig.add_scatter(
        x=expected,
        y=expected,
        name="Expected",
        row=1,
        col=1,
        mode="lines+markers",
        connectgaps=True,
    )
    fig.add_scatter(
        x=expected,
        y=accuracy_filtered,
        name="Accuracy",
        row=1,
        col=1,
        mode="lines+markers",
        connectgaps=True,
    )

    fig.update_layout(
        yaxis_title="Accuracy",
        barmode="stack",
        xaxis_tickmode="linear",
        xaxis_tick0=0.0,
        xaxis_dtick=(1.0 / len(expected)),
        margin=dict(l=20, r=20, t=30, b=20),
        title=dict(text=f"ECE={ece:.3f}", x=0.5),
        legend=dict(x=0.03, y=1, traceorder="reversed", bgcolor="rgba(0,0,0,0)"),
        colorway=[Colors.Blue, Colors.Gray_transparent, Colors.DataViz2],
        plot_bgcolor="white",
    )
    fig.update_yaxes(title_text="Count", row=2, col=1)
    fig.update_xaxes(title_text="Confidence", row=2, col=1)
    return fig
