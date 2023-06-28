import { CustomObject } from "types/api";
import JSONField from "./JSONField";
import StringField from "./StringField";
import React from "react";

const CustomObjectFields: React.FC<{
  excludeClassName?: boolean;
  disabled: boolean;
  value: CustomObject;
  originalValue: CustomObject | undefined;
  onChange: (update: Partial<CustomObject>) => void;
}> = ({ excludeClassName, disabled, value, originalValue, onChange }) => (
  <>
    {!excludeClassName && (
      <StringField
        label="class_name"
        value={value.class_name}
        originalValue={originalValue?.class_name}
        disabled={disabled}
        onChange={(class_name) => onChange({ class_name })}
      />
    )}
    <StringField
      label="remote"
      nullable
      value={value.remote}
      originalValue={originalValue?.remote}
      disabled={disabled}
      onChange={(remote) => onChange({ remote })}
    />
    <JSONField
      array
      label="args"
      value={value.args}
      originalValue={originalValue?.args}
      disabled={disabled}
      onChange={(args) => onChange({ args })}
    />
    <JSONField
      label="kwargs"
      value={value.kwargs}
      originalValue={originalValue?.kwargs}
      disabled={disabled}
      onChange={(kwargs) => onChange({ kwargs })}
    />
  </>
);

export default React.memo(CustomObjectFields);
