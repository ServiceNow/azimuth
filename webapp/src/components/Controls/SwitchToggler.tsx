import React from "react";
import { FormGroup, FormControlLabel, Switch } from "@mui/material";

type LabelPlacement = "top" | "bottom" | "start" | "end";

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
  return (
    <FormGroup aria-label="position" row>
      <FormControlLabel
        control={
          <Switch
            checked={enable ?? false}
            onChange={(_, checked) => onChange(checked)}
          />
        }
        label={label}
        labelPlacement={labelPlacement ?? undefined}
      />
    </FormGroup>
  );
};

export default React.memo(SwitchToggler);
