/**
 * Theme Provider Component
 * Provides Material UI theme to the application with light/dark mode support
 */

import React from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { useThemeMode } from "../contexts/ThemeContext";
import { getTheme } from "../theme";

/**
 * Theme provider wrapper for Material UI theme
 * @param {React.ReactNode} children - Child components to wrap
 */
export const ThemeProvider = ({ children }) => {
  const { mode } = useThemeMode();
  const theme = getTheme(mode);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
};

