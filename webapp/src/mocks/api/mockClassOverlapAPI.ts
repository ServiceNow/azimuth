import { rest } from "msw";
import { ClassOverlapTableClassPair } from "types/api";

const baseUrl = "http://localhost/api/local";

export const getClassOverlapAPIResponse = rest.get(
  `${baseUrl}/dataset_splits/train/class_overlap`,
  (req, res, ctx) => {
    const classOverlapResponse: ClassOverlapTableClassPair[] = [
      {
        sourceClass: "negative",
        targetClass: "positive",
        overlapScoreTrain: 0.4126637554585153,
        pipelineConfusionEval: 47,
        utteranceCountSourceTrain: 458,
        utteranceCountSourceEval: 428,
        utteranceCountWithOverlapTrain: 403,
      },
      {
        sourceClass: "positive",
        targetClass: "negative",
        overlapScoreTrain: 0.24649446494464944,
        pipelineConfusionEval: 31,
        utteranceCountSourceTrain: 542,
        utteranceCountSourceEval: 444,
        utteranceCountWithOverlapTrain: 364,
      },
    ];
    return res(ctx.json(classOverlapResponse));
  }
);
