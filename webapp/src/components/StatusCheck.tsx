import DoneIcon from "@mui/icons-material/Done";
import ErrorIcon from "@mui/icons-material/Error";
import { Box, capitalize, CircularProgress, Typography } from "@mui/material";
import noData from "assets/launch.svg";
import React from "react";
import { useParams } from "react-router-dom";
import { getStatusEndpoint } from "services/api";
import Loading from "./Loading";

type Props = {
  children: React.ReactNode;
};

const STATUS_ICONS: Record<string, React.ReactElement> = {
  finished: <DoneIcon color="success" />,
  not_started: <DoneIcon color="success" />, // Happens when the task was already computed.
  pending: <CircularProgress size={16} sx={{ margin: "2px" }} />,
  error: <ErrorIcon color="error" />,
  lost: <ErrorIcon color="error" />,
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
        height="100vh"
      >
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          gap={4}
          width={700}
        >
          <img src={noData} alt="Startup tasks still in progress" width={400} />
          <Typography variant="h2" align="center">
            <Typography variant="inherit">
              The startup tasks are still in progress.
            </Typography>
            <Typography variant="inherit">
              Grab a coffee and we will auto-refresh for you.
            </Typography>
          </Typography>
          <Box
            display="grid"
            rowGap={2}
            columnGap={8}
            gridTemplateColumns="repeat(2, 1fr)"
          >
            {Object.entries(status.startupTasksStatus).map(([task, status]) => (
              <Box display="flex" alignItems="center" gap={1}>
                {STATUS_ICONS[status]}
                <Typography>{capitalize(task).replace(/_/g, " ")}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    );
  }

  return <>{children}</>;
};

export default React.memo(StatusCheck);
