import { Settings as SettingsIcon } from "@mui/icons-material";
import {
  Box,
  Breadcrumbs,
  Dialog,
  IconButton,
  Link,
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
import HelpMenu from "components/HelpMenu";
import PipelineSelect from "components/PipelineSelect";
import Settings from "pages/Settings";

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
  const {
    classOverlap,
    confusionMatrix,
    filters,
    pagination,
    pipeline,
    postprocessing,
  } = useQueryState();

  // If present, preserve pipelineIndex when navigating, but nothing else
  const searchString = constructSearchString(pipeline);

  const setPipeline = (pipelineIndex?: number) => {
    history.push(
      `${location.pathname}${constructSearchString({
        ...classOverlap,
        ...confusionMatrix,
        ...filters,
        ...pagination,
        ...postprocessing,
        pipelineIndex,
      })}`
    );
  };
  const [openConfigModal, setOpenConfigModal] = React.useState(false);
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
          pathname: `/${jobId}/dataset_splits/${datasetSplitName}/class_overlap`,
          name: "Class Overlap",
        },
        {
          pathname: `/${jobId}/dataset_splits/${datasetSplitName}/pipeline_metrics`,
          name: "Pipeline Metrics by Data Subpopulation",
        },
        {
          pathname: `/${jobId}/dataset_splits/${datasetSplitName}/smart_tags`,
          name: "Smart Tag Analysis",
        },
        {
          pathname: `/${jobId}/settings`,
          name: "Settings",
        },
        {
          pathname: `/${jobId}/thresholds`,
          name: "Threshold Comparison",
        },
        {
          pathname: `/${jobId}/dataset_warnings`,
          name: "Dataset Warnings",
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
                <PipelineSelect
                  selectedPipeline={pipeline.pipelineIndex}
                  onChange={setPipeline}
                  pipelines={config?.pipelines ?? []}
                />
              </>
            )}
            <IconButton
              size="small"
              color="primary"
              onClick={() => setOpenConfigModal(true)}
              sx={{
                padding: 0,
                "&:hover > svg": {
                  transform: "rotate(60deg)",
                  transition: "0.3s ease-in-out",
                },
              }}
            >
              <SettingsIcon />
            </IconButton>
            <HelpMenu />
          </Box>
          <Dialog
            aria-labelledby="config-dialog-title"
            maxWidth="md"
            scroll="paper"
            disableEscapeKeyDown
            open={openConfigModal}
            onClose={(_, reason) => setOpenConfigModal(false)}
            sx={{
              "& .MuiDialogContent-root": {
                padding: (theme) => theme.spacing(1),
              },
              "& .MuiDialogActions-root": {
                display: "flex",
                justifyContent: "space-between",
                paddingX: (theme) => theme.spacing(2),
                gap: 1,
              },
            }}
          >
            <Settings setOpen={setOpenConfigModal} />
          </Dialog>
        </div>
      )}
    </div>
  );
};

export default React.memo(PageHeader);
