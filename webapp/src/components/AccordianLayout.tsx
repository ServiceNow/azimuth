import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Divider,
  Typography,
} from "@mui/material";
import React from "react";
import Description from "components/Description";

type Props = {
  name: string;
  description: string;
  docURL: string;
  children: React.ReactNode;
};

const AccordianLayout: React.FC<Props> = ({
  name,
  description,
  docURL,
  children,
}) => {
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} id={name}>
        <Typography
          variant="body1"
          sx={{
            width: "15%",
            flexShrink: 0,
          }}
        >
          {name}
        </Typography>
        <Box display="flex" gap={2}>
          <Typography variant="body1">{description}</Typography>
          <Description link={docURL} />
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Divider sx={{ marginBottom: 1 }} />
        {children}
      </AccordionDetails>
    </Accordion>
  );
};

export default React.memo(AccordianLayout);
