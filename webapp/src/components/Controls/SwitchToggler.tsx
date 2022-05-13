import React from "react";
import { FormGroup, FormControlLabel, Switch } from "@mui/material";
import { LabelPlacement } from "utils/const";

type Props = {
  label: string;
  labelPlacement: LabelPlacement;
  enable?: true;
  onChange: (toggleValue: boolean) => void;
};

const SwitchToggler: React.FC<Props> = ({
  label,
  labelPlacement,
  enable,
  onChange,
}) => {
  const handleSwitchChange = (checked: boolean) => {
    onChange(checked);
  };
  return (
    <FormGroup aria-label="position" row>
      <FormControlLabel
        control={
          <Switch
            checked={enable}
            onChange={(_, checked) => handleSwitchChange(checked)}
          />
        }
        label={label}
        labelPlacement={labelPlacement ?? undefined}
      />
    </FormGroup>
  );
};

export default React.memo(SwitchToggler);
