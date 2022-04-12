import React from "react";
import makeStyles from "@mui/styles/makeStyles";
import { classNames } from "utils/helpers";
import { Box, Tooltip, Typography } from "@mui/material";
import { Variant } from "@mui/material/styles/createTypography";
import { Utterance } from "types/api";

const useStyles = makeStyles(() => ({
  tokenHighlight: {
    wordBreak: "break-word",
    "& > span": {
      borderRadius: 3,
      padding: 2,
    },
    "&$noSpaceAfter": {
      "& > span": {
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
        paddingRight: 0,
      },
      "& + $tokenHighlight > span": {
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
        paddingLeft: 0,
      },
    },
    "&:not(:last-child):not($noSpaceAfter)::after": {
      content: "' '",
    },
  },
  noSpaceAfter: {},
}));

type Props = {
  variant?: Variant;
  tooltip?: boolean;
  utterance: Utterance;
};

type TokensProps = {
  tokens: string[];
  tooltip?: boolean;
  saliencies: number[];
};

const UtteranceSaliency: React.FC<Props> = ({
  variant = "body2",
  tooltip = false,
  utterance: { modelSaliency, utterance },
}) => {
  return (
    <Typography display="inline" variant={variant}>
      {modelSaliency ? Tokens({ tooltip, ...modelSaliency }) : utterance}
    </Typography>
  );
};

const Tokens: React.FC<TokensProps> = ({
  tokens,
  tooltip = false,
  saliencies,
}) => {
  const classes = useStyles();
  const minSaliency = Math.min(...saliencies);
  const maxSaliency = Math.max(...saliencies);
  const rangeSaliency = maxSaliency - minSaliency;

  const renderToken = (currentToken: string, index: number) => {
    const saliency = saliencies[index];
    const normalizedSaliency = (saliency - minSaliency) / rangeSaliency;
    const nextToken = tokens[index + 1];
    const backgroundColor =
      normalizedSaliency < 1 / 6
        ? `none`
        : `hsl(53, 100%, 50%, ${normalizedSaliency * 60}%)`;

    const token = (
      <Box
        component="span"
        key={index}
        className={classNames(
          classes.tokenHighlight,
          nextToken?.startsWith("##") ? classes.noSpaceAfter : ""
        )}
      >
        <Box component="span" bgcolor={backgroundColor}>
          {currentToken.replace(/^##/, "")}
        </Box>
      </Box>
    );

    return tooltip ? (
      <Tooltip
        key={index}
        arrow
        title={`Saliency: ${saliency.toFixed(2)}`}
        aria-label={`saliency-${index}`}
      >
        {token}
      </Tooltip>
    ) : (
      token
    );
  };

  return <>{tokens.map(renderToken)}</>;
};

export default React.memo(UtteranceSaliency);
