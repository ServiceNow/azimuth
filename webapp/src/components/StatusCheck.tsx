import { Box, capitalize, Stack, Typography } from "@mui/material";
import noData from "assets/launch.svg";
import React from "react";
import { useParams } from "react-router-dom";
import { getStatusEndpoint } from "services/api";
import Loading from "./Loading";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import CheckIcon from "./Icons/Check";
import ErrorIcon from "@mui/icons-material/Error";
import PendingOutlinedIcon from "@mui/icons-material/PendingOutlined";

type Props = {
  children: React.ReactNode;
};

interface StringByString {
  [key: string]: any;
}

const STATUS_ICON_MAPPING: StringByString = {
  finished: <CheckIcon />,
  not_started: <CheckIcon />,
  pending: <PendingOutlinedIcon />,
  error: <ErrorIcon />,
  lost: <ErrorIcon />,
};

const render_cell = (task_name: string, task_status: string) => (
  <Grid item xs={1.5}>
    <Paper variant="outlined">
      <Box display="flex" alignItems="center" gap={1}>
        <Typography>
          {`${task_name.split("_").map(capitalize).join(" ")}  `}
          {STATUS_ICON_MAPPING[task_status]}
        </Typography>
      </Box>
    </Paper>
  </Grid>
);

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
            The startup tasks are still in progress. Grab a coffee and we will
            auto-refresh for you.
          </Typography>
          <Grid container spacing={2} columnSpacing={3} columns={3}>
            {Object.entries(status.startupTasksStatus).map(
              ([task_name, task_status]) => render_cell(task_name, task_status)
            )}
          </Grid>
        </Box>
      </Box>
    );
  }

  return <>{children}</>;
};

export default React.memo(StatusCheck);
