# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from enum import Enum
from typing import List

TITLE_FONT_SIZE = 20
AXIS_FONT_SIZE = 14
MARGIN = 32
PAPER_MARGINS = dict(t=54 + MARGIN, b=AXIS_FONT_SIZE + MARGIN, r=180, l=180)
X_LEFT_LEGEND = 1.04
X_RIGHT_LEGEND = 1.08
SANKEY_PALETTE = [
    "#B8D8E9",
    "#83A8BC",
    "#FDCC8C",
    "#FCB11F",
    "#FCAEAD",
    "#FF8271",
    "#C1E5A1",
    "#558A26",
    "#FFFFB9",
    "#FFEB38",
    "#4C93C3",
    "#1D5A93",
    "#D5C1DE",
    "#B873D8",
    "#9DD196",
    "#56D44D",
    "#A0E8E3",
    "#45BDB5",
]


class Colors(str, Enum):
    Red = "#DB8F8F"
    Red_transparent = "rgba(209, 86, 86, 0.7)"
    Orange = "#ff9800"
    DataViz2 = "#006DB3"
    DataViz1 = "#63CCFF"
    Axis = "rgba(0, 0, 0, 0.2)"
    Gray_transparent = "rgba(41, 62, 64, 0.08)"
    Blue = "#2196F3"
    Text = "#2a3d40"


def fig_default(fig):
    """Basic layout applicable to all plots.

    Args:
        fig: Figure.

    Returns:
        Figure with layout modified.

    """
    fig.update_layout(
        colorway=[Colors.DataViz1, Colors.DataViz2],
        plot_bgcolor="white",
        title_x=0.5,
        title_font_size=TITLE_FONT_SIZE,
        font_family="Gilroy",
        font_size=AXIS_FONT_SIZE,
        font_color=Colors.Text,
        margin=PAPER_MARGINS,
        width=1000,
    )
    fig.update_xaxes(tickfont_size=AXIS_FONT_SIZE, fixedrange=True)
    fig.update_yaxes(tickfont_size=AXIS_FONT_SIZE, fixedrange=True)
    return fig


def shorten_cls_names(cls_names: List[str]) -> List[str]:
    return [
        class_name if len(class_name) < 24 else class_name[:20] + "..." for class_name in cls_names
    ]
