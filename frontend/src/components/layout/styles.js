/**
 * Styled Components for Sidebar Navigation
 * Separated from Sidebar.js for better organization
 */

import { ListItemButton } from "@mui/material";
import { styled } from "@mui/material/styles";

// Helper function to convert hex to rgba with opacity
export const hexToRgba = (hex, opacity) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Styled Component for Main Navigation Items
export const StyledNavItemButton = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== "itemColor" && prop !== "collapsed" && prop !== "hasSubItems" && prop !== "isDark",
})(({ theme, itemColor, collapsed, hasSubItems, isDark }) => ({
  borderRadius: collapsed ? theme.spacing(2.5) : theme.spacing(3),
  marginX: collapsed ? theme.spacing(0.5) : 0,
  marginBottom: hasSubItems && !collapsed ? theme.spacing(0.5) : theme.spacing(1.25),
  paddingX: collapsed ? theme.spacing(1.25) : theme.spacing(2.5),
  paddingY: collapsed ? theme.spacing(1.75) : theme.spacing(2),
  justifyContent: collapsed ? "center" : "flex-start",
  transition: "all 0.2s ease-in-out",
  backgroundColor: "transparent",
  border: "none",
  position: "relative",
  "&.Mui-selected": {
    backgroundColor: hexToRgba(itemColor, isDark ? 0.15 : 0.1), // Lighter tone of item color
    color: itemColor,
    borderLeft: collapsed ? "none" : `4px solid ${itemColor}`, // Left indicator
    "&:hover": {
      backgroundColor: hexToRgba(itemColor, isDark ? 0.2 : 0.15), // Slightly darker on hover when selected
    },
    "&:focus-visible": {
      outline: `2px solid ${itemColor}`,
      outlineOffset: "2px",
    },
    "& .MuiListItemIcon-root": {
      color: itemColor,
    },
  },
  "&:hover:not(.Mui-selected)": {
    backgroundColor: theme.palette.action.hover, // Grey background on hover
  },
  "&:focus-visible": {
    outline: `2px solid ${itemColor}`,
    outlineOffset: "2px",
  },
}));

// Styled Component for Sub-Navigation Items
export const StyledSubNavItemButton = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== "itemColor" && prop !== "isDark",
})(({ theme, itemColor, isDark }) => ({
  borderRadius: theme.spacing(2.5),
  marginX: theme.spacing(0.5),
  marginBottom: theme.spacing(0.75),
  paddingLeft: theme.spacing(5),
  paddingY: theme.spacing(1.5),
  transition: "all 0.2s ease-in-out",
  backgroundColor: "transparent",
  border: "none",
  position: "relative",
  "&.Mui-selected": {
    backgroundColor: hexToRgba(itemColor, isDark ? 0.15 : 0.1), // Lighter tone of item color
    color: itemColor,
    borderLeft: `3px solid ${itemColor}`, // Left indicator
    "&:hover": {
      backgroundColor: hexToRgba(itemColor, isDark ? 0.2 : 0.15), // Slightly darker on hover when selected
    },
    "&:focus-visible": {
      outline: `2px solid ${itemColor}`,
      outlineOffset: "2px",
    },
    "& .MuiListItemIcon-root": {
      color: itemColor,
    },
  },
  "&:hover:not(.Mui-selected)": {
    backgroundColor: theme.palette.action.hover, // Grey background on hover
  },
  "&:focus-visible": {
    outline: `2px solid ${itemColor}`,
    outlineOffset: "2px",
  },
}));

