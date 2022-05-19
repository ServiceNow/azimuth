import React from "react";
import { FormControlLabel, FormControlLabelProps, Switch } from "@mui/material";

type Props = {
  label: string;
  enable?: true;
  onChange: (toggleValue: boolean) => void;
};

const SwitchToggler: React.FC<Props> = ({ label, enable, onChange }) => {
  return (
    <FormControlLabel
      control={
        <Switch
          checked={enable ?? false}
          onChange={(_, checked) => onChange(checked)}
        />
      }
      label={label}
    />
  );
};

export default React.memo(SwitchToggler);
