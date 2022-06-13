import { Settings } from "@mui/icons-material";
import {
  Box,
  Breadcrumbs,
  IconButton,
  Link,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import useQueryState from "hooks/useQueryState";
import React from "react";
import {
  Link as RouterLink,
  useHistory,
  useLocation,
  useParams,
} from "react-router-dom";
import { getConfigEndpoint, getDatasetInfoEndpoint } from "services/api";
import { DatasetSplitName } from "types/api";
import { constructSearchString } from "utils/helpers";
import HelpMenu from "./HelpMenu";

const useStyles = makeStyles((theme) => ({
  jobHeader: {
    display: "flex",
    justifyContent: "space-between",
    backgroundColor: theme.palette.grey[200],
    padding: theme.spacing(1, 3, 1, 3),
    borderBottom: `1px ${theme.palette.grey[300]} solid`,
  },
  label: {
    fontWeight: "bold",
    marginRight: theme.spacing(1),
  },
}));

const PageHeader = () => {
  const classes = useStyles();
  const {
    jobId,
    utteranceId,
    datasetSplitName,
    mainView = "utterances",
  } = useParams<{
    jobId: string;
    utteranceId?: string;
    datasetSplitName?: DatasetSplitName;
    mainView?: string;
  }>();

  const { data: config } = getConfigEndpoint.useQuery(
    { jobId },
    { skip: jobId === undefined }
  );

  const { data: datasetInfo } = getDatasetInfoEndpoint.useQuery(
    { jobId },
    { skip: jobId === undefined }
  );

  const history = useHistory();
  const location = useLocation();
  const { confusionMatrix, filters, pagination, pipeline, postprocessing } =
    useQueryState();

  // If present, preserve pipelineIndex when navigating, but nothing else
  const searchString = constructSearchString(pipeline);

  const setPipeline = (pipelineIndex?: number) => {
    history.push(
      `${location.pathname}${constructSearchString({
        ...confusionMatrix,
        ...filters,
        ...pagination,
        ...postprocessing,
        pipelineIndex,
      })}`
    );
  };

  const dashboardPathname = `/${jobId}`;

  const isDashboard = location.pathname === dashboardPathname;

  const subrouteBreadcrumbs = React.useMemo(
    () =>
      [
        {
          pathname: `/${jobId}`,
          name: "Dashboard",
        },
        {
          pathname: `/${jobId}/behavioral_testing_summary`,
          name: "Behavioral Testing Summary",
        },
        {
          pathname: `/${jobId}/settings`,
          name: "Settings",
        },
        {
          pathname: `/${jobId}/threshold`,
          name: "Threshold Comparison",
        },
        {
          pathname: `/${jobId}/dataset_class_distribution_analysis`,
          name: "Dataset Class Distribution Analysis",
        },
        {
          pathname: `/${jobId}/dataset_splits/${datasetSplitName}/${mainView}`,
          name: "Exploration",
        },
        {
          pathname: `/${jobId}/dataset_splits/${datasetSplitName}/utterances/${utteranceId}`,
          name: "Utterance Details",
        },
      ]
        .filter(({ pathname }) => location.pathname.includes(pathname))
        .map(({ pathname, name }) =>
          pathname === location.pathname ? (
            <Typography variant="body1" key={name}>
              {name}
            </Typography>
          ) : (
            <Link
              component={RouterLink}
              key={name}
              to={`${pathname}${searchString}`}
            >
              {name}
            </Link>
          )
        ),
    [
      jobId,
      utteranceId,
      datasetSplitName,
      mainView,
      location.pathname,
      searchString,
    ]
  );

  return (
    <div>
      {jobId && (
        <div className={classes.jobHeader}>
          <Breadcrumbs>{!isDashboard && subrouteBreadcrumbs}</Breadcrumbs>
          <Box display="flex" gap={3}>
            {datasetInfo && (
              <>
                <Typography variant="body1">
                  <span className={classes.label}>Project:</span>
                  <span>{datasetInfo.projectName}</span>
                </Typography>
                <Select
                  variant="standard"
                  displayEmpty
                  value={pipeline.pipelineIndex ?? ""}
                  sx={{ ".MuiSelect-select": { paddingY: 0 } }}
                  onChange={({ target: { value } }) =>
                    setPipeline(typeof value === "number" ? value : undefined)
                  }
                >
                  <MenuItem value="">
                    <em>No pipeline</em>
                  </MenuItem>
                  {config?.pipelines?.map((pipeline, pipelineIndex) => (
                    <MenuItem key={pipelineIndex} value={pipelineIndex}>
                      {pipeline.name}
                    </MenuItem>
                  ))}
                </Select>
              </>
            )}
            <IconButton
              component={RouterLink}
              size="small"
              color="primary"
              to={`/${jobId}/settings${searchString}`}
              sx={{
                padding: 0,
                "&:hover > svg": {
                  transform: "rotate(60deg)",
                  transition: "0.3s ease-in-out",
                },
              }}
            >
              <Settings />
            </IconButton>
            <HelpMenu />
          </Box>
        </div>
      )}
    </div>
  );
};

export default React.memo(PageHeader);
