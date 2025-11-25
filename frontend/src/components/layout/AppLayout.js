/**
 * Application Layout Component
 * Main layout shell with responsive sidebar, header, and content area
 */

import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Box, CssBaseline, Drawer, Toolbar, useMediaQuery, useTheme } from "@mui/material";
import { COLORS } from "../../constants";
import Sidebar from "./Sidebar";
import Header from "./Header";

const drawerWidth = 260;

const AppLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(!isMobile); // Open by default on desktop, closed on mobile

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <CssBaseline />
      <Header drawerWidth={drawerOpen ? drawerWidth : 0} onMenuClick={handleDrawerToggle} />
      <Box component="nav" sx={{ width: drawerOpen ? drawerWidth : 0, flexShrink: 0, transition: "width 0.3s" }}>
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
              backgroundColor: theme.palette.mode === "dark" ? theme.palette.background.paper : COLORS.neutral.gray100,
            },
          }}
        >
          <Sidebar />
        </Drawer>
        {/* Desktop drawer - persistent with toggle */}
        <Drawer
          variant="persistent"
          open={drawerOpen && !isMobile}
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              transition: "width 0.3s",
              borderRadius: 0,
              backgroundColor: theme.palette.mode === "dark" ? theme.palette.background.paper : COLORS.neutral.gray100,
            },
          }}
        >
          <Sidebar />
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: "background.default",
          p: { xs: 2, sm: 3 },
          width: { xs: "100%", md: drawerOpen ? `calc(100% - ${drawerWidth}px)` : "100%" },
          transition: "width 0.3s",
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default AppLayout;

