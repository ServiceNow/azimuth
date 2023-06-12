import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionProps,
  AccordionSummary,
  Box,
  Divider,
  Typography,
} from "@mui/material";
import Description from "components/Description";
import React from "react";

type Props = AccordionProps & {
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
  ...props
}) => (
  <Accordion {...props}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />} id={name}>
      <Typography fontWeight="bold" width="20%" flexShrink={0}>
        {name}
      </Typography>
      <Box display="flex" gap={2}>
        <Divider orientation="vertical" />
        <Typography>{description}</Typography>
        <Description link={link} />
      </Box>
    </AccordionSummary>
    <AccordionDetails
      sx={{ display: "flex", flexDirection: "column", paddingY: 0 }}
    >
      <Divider />
      {children}
    </AccordionDetails>
  </Accordion>
);

export default React.memo(AccordionLayout);
