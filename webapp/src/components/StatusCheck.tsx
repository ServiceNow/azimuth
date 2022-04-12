import { CircularProgress, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import noData from "assets/launch.svg";
import React from "react";
import { useParams } from "react-router-dom";
import { getStatusEndpoint } from "services/api";
import Loading from "./Loading";

const useStyles = makeStyles(() => ({
  container: {
    display: "grid",
    justifyContent: "center",
    alignContent: "center",
    width: "100%",
    height: "75vh",
  },
  content: {
    width: 600,
    textAlign: "center",
  },
  image: {
    width: 400,
    display: "block",
    margin: "auto",
  },
}));

type Props = {
  children: React.ReactNode;
};

const StatusCheck: React.FC<Props> = ({ children }) => {
  const classes = useStyles();
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
      <div className={classes.container}>
        <div className={classes.content}>
          <img
            className={classes.image}
            src={noData}
            alt="Startup tasks still in progress"
          />
          <CircularProgress size="3rem" />
          <Typography variant="h2">
            The startup tasks are still in progress. Grab a coffee and we will
            auto-refresh for you.
          </Typography>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default React.memo(StatusCheck);
