import { createSvgIcon } from "@mui/material";

const ARROW = `M${15.5 + 5 * Math.SQRT1_2},12
L${13.5 + Math.SQRT2},${9 - Math.SQRT2} L13.5,9 L15.5,11 H7 V13 H15.5 L13.5,15
L${13.5 + Math.SQRT2},${15 + Math.SQRT2} Z`;

const CHECK =
  "M18,9.19194 L11.1598,17 L6,12.5826 L7.23266,11.2042 L10.9693,14.4032 L16.5787,8 L18,9.19194 Z";

const CIRCLE = "M12,2 A10,10 0,0,0 12,22 A10,10 0,0,0 12,2 Z";

const CIRCLE_STROKE = "M12,3 A9,9 0,0,0 12,21 A9,9 0,0,0 12,3 Z";

const xy = (r: number, a: number) =>
  [Math.cos, Math.sin].map((f) => 12 + r * f((Math.PI * (a + 6.5)) / 11));
const arc = (i: number, r: number, sweep: 0 | 1) =>
  `${xy(r, 2 * i + 1 - sweep)} A${r},${r} 0,0,${sweep} ${xy(r, 2 * i + sweep)}`;
const DASHED_CIRCLE = [
  "M12,22 A10,10 0,0,0 12,2 V4 A8,8 0,0,1 12,20 Z",
  ...Array.from(Array(5), (_, i) => `M${arc(i, 10, 0)} L${arc(i, 8, 1)} Z`),
];

const EXTREME_LENGTH =
  "M8,12 L4.512,9.184 A8,8 0,0,1 19.488,9.184 L16,12 L19.488,14.816 A8,8 0,0,1 4.512,14.816 Z";

const HALF_CIRCLE = "M12,4 A8,8 0,0,1 12,20 Z";

const HEXAGON_APOTHEM = 4;
const HEXAGON_CIRCUMRADIUS = HEXAGON_APOTHEM / Math.cos(Math.PI / 6);
const PIPELINE_COMPARISON_STROKE = `M16,${12 + HEXAGON_APOTHEM}
H${12 - HEXAGON_CIRCUMRADIUS / 2} L${12 - HEXAGON_CIRCUMRADIUS},12 H3
H${12 - HEXAGON_CIRCUMRADIUS}
L${12 - HEXAGON_CIRCUMRADIUS / 2},${12 - HEXAGON_APOTHEM} H16`;

const QUESTION_MARK =
  "M10.7946,15 H12.6429 V14.4548 C12.6429,13.5343 12.9732,13.0606 14.125,12.3813 C15.3036,11.6753 16,10.7011 16,9.32473 V9.30685 C16,7.40318 14.4107,6 12.0536,6 C9.46429,6 8.08036,7.53724 8,9.5571 V9.57498 L9.83929,9.56604 H9.85714 C9.92857,8.3863 10.7232,7.64449 11.9554,7.64449 C13.1786,7.64449 13.9732,8.3863 13.9732,9.38729 V9.40516 C13.9732,10.3168 13.5893,10.8352 12.5089,11.4876 C11.2857,12.2205 10.7411,13.0248 10.7857,14.285 L10.7946,15 Z M10.8242,16.1328 V18.0026 H12.694 V16.1328 H10.8242 Z";

const T = "M8,7 H16 V9 H13 V17 H11 V9 H8 V7 Z";

export const AlmostCorrect = createSvgIcon(
  <path d={[...DASHED_CIRCLE, CHECK].join(" ")} />,
  "AlmostCorrect"
);

export const BehavioralTesting = createSvgIcon(
  <path d={[CIRCLE, HALF_CIRCLE, ARROW].join(" ")} fillRule="evenodd" />,
  "BehavioralTesting"
);

export const Dissimilar = createSvgIcon(
  <path d={[CIRCLE, HALF_CIRCLE].join(" ")} />,
  "Dissimilar"
);

export const ExtremeLength = createSvgIcon(
  <path d={[CIRCLE, EXTREME_LENGTH, T].join(" ")} />,
  "ExtremeLength"
);

export const PartialSyntax = createSvgIcon(
  <path d={[...DASHED_CIRCLE, T].join(" ")} />,
  "PartialSyntax"
);

export const PipelineComparison = createSvgIcon(
  <path
    d={[CIRCLE_STROKE, PIPELINE_COMPARISON_STROKE].join(" ")}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
  />,
  "PipelineComparison"
);

export const Uncertain = createSvgIcon(
  <path d={[...DASHED_CIRCLE, QUESTION_MARK].join(" ")} />,
  "Uncertain"
);
