import { createSvgIcon } from "@mui/material";

const TARGET = Array.from(Array(5), (_, i) => 10 - 2 * i).flatMap((r, i) => [
  `M12,${12 - r} A${r},${r} 0,0,${i % 2} 12,${12 + r}`,
  `A${r},${r} 0,0,${i % 2} 12,${12 - r} Z`,
]);

const TargetIcon = createSvgIcon(<path d={TARGET.join(" ")} />, "Target");

export default TargetIcon;
