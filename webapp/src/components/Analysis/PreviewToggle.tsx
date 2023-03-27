import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import React from "react";

type Props = {
  defaultOption?: number;
  options: {
    button: React.ReactElement<typeof ToggleButton>;
    content: React.ReactNode;
  }[];
};

const PreviewToggle: React.FC<Props> = ({ defaultOption = 0, options }) => {
  const [option, setOption] = React.useState(defaultOption);

  const handleOptionChange = (newValue: number | null) => {
    if (newValue !== null) {
      setOption(newValue);
    }
  };

  return (
    <Box display="flex" gap={4} height="100%">
      <ToggleButtonGroup
        color="secondary"
        exclusive
        orientation="vertical"
        sx={{ flex: 1 }}
        value={option}
        onChange={(_, value) => handleOptionChange(value)}
      >
        {options.map(({ button }) => button)}
      </ToggleButtonGroup>
      <Box width={1002}>{options[option].content}</Box>
    </Box>
  );
};

export default PreviewToggle;
