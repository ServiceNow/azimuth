import { Box, Typography } from "@mui/material";
import React, { ReactNode } from "react";

interface ErrorBoundaryProps {
  children?: ReactNode;
}
interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.setState({
      error: error,
    });
  }

  render() {
    if (this.state.error) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignContent="center"
          alignItems="center"
          justifyContent="center"
          height="75vh"
        >
          <Typography variant="h1">Something went wrong.</Typography>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
