import { Box, Typography } from "@mui/material";
import noData from "assets/launch.svg";
import React from "react";
import { useParams } from "react-router-dom";
import { getStatusEndpoint } from "services/api";
import Loading from "./Loading";

type Props = {
  children: React.ReactNode;
};

const StatusCheck: React.FC<Props> = ({ children }) => {
  const { jobId } = useParams<{ jobId: string }>();
  const { data: status, refetch } = getStatusEndpoint.useQuery({ jobId });

  React.useEffect(() => {
    if (!status?.startupTasksReady) {
      const timer = setTimeout(refetch, 5000);
      return () => clearTimeout(timer);
    }
  });

  if (!status) {
    return <Loading />;
  }

  if (!status.startupTasksReady) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        width="100%"
        height="75vh"
      >
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          gap={4}
          width={600}
        >
          <img src={noData} alt="Startup tasks still in progress" width={400} />
          <Typography variant="h2" align="center">
            The startup tasks are still in progress. Grab a coffee and we will
            auto-refresh for you.
          </Typography>
        </Box>
      </Box>
    );
  }

  return <>{children}</>;
};

export default React.memo(StatusCheck);
