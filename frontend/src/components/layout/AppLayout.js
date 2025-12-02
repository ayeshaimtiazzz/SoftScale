/**
 * Application Layout Component
 * Main layout shell with responsive sidebar, header, and content area
 * Features a mini variant drawer that shows icons when collapsed
 */

import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Box, CssBaseline, Drawer, Toolbar, useMediaQuery, useTheme } from "@mui/material";
import { COLORS } from "../../constants";
import Sidebar from "./Sidebar";
import Header from "./Header";

const drawerWidth = 260;
const miniDrawerWidth = 64;

const AppLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(!isMobile); // Open by default on desktop, closed on mobile
  const [drawerCollapsed, setDrawerCollapsed] = useState(false); // Collapsed state for mini variant

  const handleDrawerToggle = () => {
    if (isMobile) {
      setDrawerOpen(!drawerOpen);
    } else {
      // On desktop, toggle between expanded and collapsed (mini variant)
      setDrawerCollapsed(!drawerCollapsed);
    }
  };

  // Calculate current drawer width based on state
  const currentDrawerWidth = isMobile
    ? drawerOpen
      ? drawerWidth
      : 0
    : drawerCollapsed
    ? miniDrawerWidth
    : drawerWidth;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <CssBaseline />
      <Header drawerWidth={currentDrawerWidth} onMenuClick={handleDrawerToggle} />
      <Box component="nav" sx={{ width: currentDrawerWidth, flexShrink: 0, transition: "width 0.3s ease-in-out" }}>
        {/* Mobile drawer - temporary */}
        <Drawer
          variant="temporary"
          open={drawerOpen && isMobile}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              borderRadius: 0,
              backgroundColor: theme.palette.background.paper,
            },
          }}
        >
          <Sidebar collapsed={false} />
        </Drawer>
        {/* Desktop drawer - persistent with mini variant */}
        <Drawer
          variant="persistent"
          open={!isMobile}
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerCollapsed ? miniDrawerWidth : drawerWidth,
              transition: theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              overflowX: "hidden",
              borderRadius: 0,
              backgroundColor: theme.palette.background.paper,
            },
          }}
        >
          <Sidebar collapsed={drawerCollapsed} />
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: "background.default",
          p: { xs: 2, sm: 3 },
          width: { xs: "100%", md: `calc(100% - ${currentDrawerWidth}px)` },
          transition: theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default AppLayout;

