import { Box, Typography } from "@mui/material";
import noData from "assets/void.svg";
import BinColumn from "components/ConfidenceHistogram/BinColumn";
import BinLabel from "components/ConfidenceHistogram/BinLabel";
import BinThresholdMarker from "components/ConfidenceHistogram/BinThresholdMarker";
import Loading from "components/Loading";
import React, { useMemo } from "react";
import { ConfidenceBinDetails, Outcome } from "types/api";

const getBinHeights = ({ outcomeCount }: ConfidenceBinDetails) => [
  outcomeCount.CorrectAndRejected + outcomeCount.CorrectAndPredicted,
  outcomeCount.IncorrectAndRejected + outcomeCount.IncorrectAndPredicted,
];

type Props = {
  isFetching: boolean;
  error?: string;
  bins?: ConfidenceBinDetails[];
  confidenceMin: number;
  confidenceMax: number;
  filteredOutcomes: readonly Outcome[];
  threshold?: number;
};

const ConfidenceHistogram: React.FC<Props> = ({
  isFetching,
  error,
  bins,
  confidenceMin,
  confidenceMax,
  filteredOutcomes,
  threshold,
}) => {
  const max = useMemo(() => {
    return bins ? Math.max(...bins.flatMap(getBinHeights)) : 0;
  }, [bins]);

  return (
    <Box flex={1} height="100%" paddingTop={3} position="relative">
      {error ? (
        <Box
          alignItems="center"
          display="flex"
          flexDirection="column"
          gap={4}
          height="100%"
          justifyContent="center"
        >
          <img src={noData} alt="No bin data" height="50%" />
          <Typography>{error}</Typography>
        </Box>
      ) : (
        <>
          <Box
            display="flex"
            height="100%"
            position="relative"
            sx={{
              // On smaller screens, hide one every two label.
              "& > div:nth-of-type(4n-1)": {
                visibility: { xs: "hidden", lg: "visible" },
              },
            }}
          >
            <BinLabel>0%</BinLabel>
            {bins?.flatMap((bin, index) => [
              <BinColumn
                key={index * 2}
                bin={bin}
                max={max}
                filteredOutcomes={
                  confidenceMin <= index / bins.length &&
                  (index + 1) / bins.length <= confidenceMax
                    ? filteredOutcomes
                    : []
                }
                topOutcomes={["CorrectAndRejected", "CorrectAndPredicted"]}
                bottomOutcomes={[
                  "IncorrectAndRejected",
                  "IncorrectAndPredicted",
                ]}
              />,
              <BinLabel key={index * 2 + 1}>
                {`${Math.round((100 / bins.length) * (index + 1))}%`}
              </BinLabel>,
            ])}
          </Box>
          {threshold && <BinThresholdMarker threshold={threshold} />}
        </>
      )}
      {isFetching && (
        <Box position="absolute" top={0} width="100%" height="100%">
          <Loading />
        </Box>
      )}
    </Box>
  );
};

export default ConfidenceHistogram;
