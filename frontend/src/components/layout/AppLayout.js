/**
 * Application Layout Component
 * Main layout shell with sidebar, header, and content area
 */

import React from "react";
import { Outlet } from "react-router-dom";
import { Box, CssBaseline, Drawer, Toolbar } from "@mui/material";
import Sidebar from "./Sidebar";
import Header from "./Header";

const drawerWidth = 260;

const AppLayout = () => {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <CssBaseline />
      <Header drawerWidth={drawerWidth} />
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
      >
        <Sidebar />
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: "background.default",
          p: 3,
          width: `calc(100% - ${drawerWidth}px)`,
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default AppLayout;

