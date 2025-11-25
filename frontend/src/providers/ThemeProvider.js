/**
 * Theme Provider Component
 * Provides Material UI theme to the application
 */

import React from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "../theme";

/**
 * Theme provider wrapper for Material UI theme
 * @param {React.ReactNode} children - Child components to wrap
 */
export const ThemeProvider = ({ children }) => {
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
};

