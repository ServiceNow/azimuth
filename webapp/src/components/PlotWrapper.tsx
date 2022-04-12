import { Warning } from "@mui/icons-material";
import { Box, MenuItem, Select } from "@mui/material";
import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";
import Plot, { PlotParams } from "react-plotly.js";
import { DatasetWarning } from "types/api";

export const ResponsivePlotWrapper: React.FC<PlotParams> = (props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  const setPlotWidth = () => {
    const width = ref?.current?.offsetWidth || 0;
    setWidth(width);
  };

  useEffect(() => {
    window.addEventListener("resize", setPlotWidth);

    return () => window.removeEventListener("resize", setPlotWidth);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (ref) {
      setPlotWidth();
    }
  }, [ref]);

  return (
    <Box ref={ref} width="100%" height="100%">
      <PlotWrapper {...props} layout={{ ...props.layout, width }} />
    </Box>
  );
};

export const PlotWrapper: React.FC<PlotParams> = (props) => {
  // Because of the plotly library mutating the passed props, we have to clone the props here
  // because on rerendered they would not match the object plotly is now using
  // https://github.com/plotly/react-plotly.js/issues/43
  const clone = _.cloneDeep(props);

  return <Plot {...clone} config={{ displayModeBar: false }} />;
};

type Props = {
  component?: typeof PlotWrapper | typeof ResponsivePlotWrapper;
  warning: DatasetWarning;
};

export const WarningPlot: React.FC<Props> = ({
  component: Component = PlotWrapper,
  warning: {
    plots: { overall, perClass },
    comparisons,
  },
}) => {
  const [view, setView] = React.useState("");

  return (
    <Box position="relative">
      <Component {...(perClass?.[view] ?? overall)} />
      {perClass && (
        <Box margin={3} position="absolute" right={0} top={0}>
          <Select
            variant="standard"
            displayEmpty
            value={view}
            onChange={(event) => setView(event.target.value)}
          >
            <MenuItem value="">
              <em>Overall</em>
            </MenuItem>
            {Object.keys(perClass).map((key) => (
              <MenuItem key={key} value={key}>
                {key}
                {comparisons?.find(({ name }) => name === key)?.alert && (
                  <Warning color="warning" sx={{ marginLeft: 1 }} />
                )}
              </MenuItem>
            ))}
          </Select>
        </Box>
      )}
    </Box>
  );
};
