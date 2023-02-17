import { Box } from "@mui/system";
import { Utterance, SimilarUtterance } from "types/api";
import { AZIMUTH_ID_COLUMN } from "./const";

export const getUtteranceIdTooltip = ({
  persistentIdColumn,
  utterance,
}: {
  persistentIdColumn: string;
  utterance: Utterance | SimilarUtterance;
}) =>
  persistentIdColumn === AZIMUTH_ID_COLUMN ? (
    ""
  ) : (
    <Box display="grid" gridTemplateColumns="auto auto" columnGap={1}>
      <span>Azimuth id:</span>
      <span>{utterance.index}</span>
      <span>{persistentIdColumn}:</span>
      <span>{utterance.persistentId}</span>
    </Box>
  );
