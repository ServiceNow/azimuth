import { Settings as SettingsIcon } from "@mui/icons-material";
import { Box, Breadcrumbs, IconButton, Link, Typography } from "@mui/material";
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
import { constructSearchString } from "utils/helpers";
import HelpMenu from "components/HelpMenu";
import PipelineSelect from "components/PipelineSelect";
import Settings from "pages/Settings";

const BREADCRUMBS = [
  {
    pathname: /^\/[^/]+/,
    name: "Dashboard",
  },
  {
    pathname: /^\/[^/]+\/behavioral_testing_summary/,
    name: "Behavioral Testing Summary",
  },
  {
    pathname: /^\/[^/]+\/dataset_splits\/[^/]+\/class_overlap/,
    name: "Class Overlap",
  },
  {
    pathname: /^\/[^/]+\/dataset_splits\/[^/]+\/pipeline_metrics/,
    name: "Pipeline Metrics by Data Subpopulation",
  },
  {
    pathname: /^\/[^/]+\/dataset_splits\/[^/]+\/smart_tags/,
    name: "Smart Tag Analysis",
  },
  {
    pathname: /^\/[^/]+\/settings/,
    name: "Settings",
  },
  {
    pathname: /^\/[^/]+\/thresholds/,
    name: "Threshold Comparison",
  },
  {
    pathname: /^\/[^/]+\/dataset_warnings/,
    name: "Dataset Warnings",
  },
  {
    pathname: /^\/[^/]+\/dataset_splits\/[^/]+\/[^/]+/,
    name: "Exploration",
  },
  {
    pathname: /^\/[^/]+\/dataset_splits\/[^/]+\/utterances\/[^/]+/,
    name: "Utterance Details",
  },
];

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
  const { jobId } = useParams<{ jobId: string }>();

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

  const [configOpen, setConfigOpen] = React.useState(false);

  React.useEffect(() => {
    if (config?.dataset === null) {
      setConfigOpen(true);
    }
  }, [config]);

  const dashboardPathname = `/${jobId}`;

  const isDashboard = location.pathname === dashboardPathname;

  const subrouteBreadcrumbs = React.useMemo(() => {
    return BREADCRUMBS.flatMap(({ pathname, name }) => {
      const match = location.pathname.match(pathname);
      return match == null ? (
        []
      ) : match[0] === location.pathname ? (
        <Typography variant="body1" key={name}>
          {name}
        </Typography>
      ) : (
        <Link
          component={RouterLink}
          key={name}
          to={`${match[0]}${searchString}`}
        >
          {name}
        </Link>
      );
    });
  }, [location.pathname, searchString]);

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
              onClick={() => setConfigOpen(true)}
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
          <Settings open={configOpen} onClose={() => setConfigOpen(false)} />
        </div>
      )}
    </div>
  );
};

export default React.memo(PageHeader);
