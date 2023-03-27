import DoneIcon from "@mui/icons-material/Done";
import ErrorIcon from "@mui/icons-material/Error";
import {
  Box,
  capitalize,
  CircularProgress,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import noData from "assets/launch.svg";
import React from "react";
import { useParams } from "react-router-dom";
import { getStatusEndpoint } from "services/api";
import Loading from "./Loading";

type Props = {
  children: React.ReactNode;
};

const PENDING = <CircularProgress size={16} sx={{ margin: "2px" }} />;

const STATUS_ICONS: Record<string, React.ReactElement> = {
  finished: <DoneIcon color="success" />,
  not_started: <DoneIcon color="success" />, // Happens when the task was already computed.
  pending: PENDING,
  error: <ErrorIcon color="error" />,
  lost: <ErrorIcon color="error" />,
};

const StatusCheck: React.FC<Props> = ({ children }) => {
  const { jobId } = useParams<{ jobId: string }>();
  const { data, isFetching, refetch } = getStatusEndpoint.useQuery({ jobId });

  React.useEffect(() => {
    if (!data?.startupTasksReady) {
      const timer = setTimeout(refetch, 5000);
      return () => clearTimeout(timer);
    }
  });

  if (!data) {
    return <Loading />;
  }

  if (!data.startupTasksReady) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        width="100%"
        height="100%"
      >
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          gap={4}
          padding={4}
          width="100%"
          sx={{ overflowY: "auto" }}
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
            {Object.entries(data.startupTasksStatus).map(([task, status]) => (
              <Box key={task} display="flex" alignItems="center" gap={1}>
                <Tooltip title={status}>{STATUS_ICONS[status]}</Tooltip>
                <Typography>{capitalize(task).replace(/_/g, " ")}</Typography>
              </Box>
            ))}
          </Box>
          {Object.values(data.startupTasksStatus).every(
            (taskStatus) => taskStatus !== "pending"
          ) && (
            <Paper>
              <Box display="flex" alignItems="center" gap={1} margin={2}>
                {PENDING}
                <Typography>
                  The results are being finalized. Hang on for a few more
                  seconds...
                </Typography>
              </Box>
            </Paper>
          )}
        </Box>
      </Box>
    );
  }

  if (isFetching) {
    // We can't be sure if the app is ready or not, so we don't render the
    // children to avoid making other API calls that would fail.
    return <Loading />;
  }

  return <>{children}</>;
};

export default React.memo(StatusCheck);
