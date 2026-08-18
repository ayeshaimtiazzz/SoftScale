/**
 * PageTitle Component
 * Consistent page title styling across the application
 */

import React from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { useThemeMode } from "../../contexts/ThemeContext";

const PageTitle = ({ title, subtitle, icon, color, sx = {} }) => {
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isDark = mode === "dark";

  // Default color if not provided
  const titleColor = color || theme.palette.primary.main;

  return (
    <Box
      sx={{
        mb: 4,
        ...sx,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: subtitle ? 1 : 0 }}>
        {icon && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: titleColor,
            }}
          >
            {icon}
          </Box>
        )}
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 600,
            color: isDark ? theme.palette.text.primary : theme.palette.text.primary,
            fontSize: "1.75rem",
            lineHeight: 1.3,
            ...(icon && { ml: 0 }),
          }}
        >
          {title}
        </Typography>
      </Box>
      {subtitle && (
        <Typography
          variant="body1"
          sx={{
            color: isDark ? theme.palette.text.secondary : theme.palette.text.secondary,
            fontSize: "0.9375rem",
            lineHeight: 1.5,
            mt: 0.5,
            ml: icon ? 5.5 : 0,
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
};

export default PageTitle;

