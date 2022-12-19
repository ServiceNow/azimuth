import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Divider,
  Typography,
} from "@mui/material";
import Description from "components/Description";
import React from "react";

type Props = {
  name: string;
  description: string;
  link: string;
  children: React.ReactNode;
};

const AccordionLayout: React.FC<Props> = ({
  name,
  description,
  link,
  children,
}) => (
  <Accordion>
    <AccordionSummary expandIcon={<ExpandMoreIcon />} id={name}>
      <Typography
        variant="body1"
        fontWeight="bold"
        sx={{
          width: "20%",
          flexShrink: 0,
        }}
      >
        {name}
      </Typography>
      <Divider orientation="vertical" flexItem sx={{ marginX: 2 }} />
      <Box display="flex" gap={2}>
        <Typography variant="body1">{description}</Typography>
        <Description link={link} />
      </Box>
    </AccordionSummary>
    <AccordionDetails>
      <Divider sx={{ marginBottom: 1 }} />
      {children}
    </AccordionDetails>
  </Accordion>
);

export default React.memo(AccordionLayout);
