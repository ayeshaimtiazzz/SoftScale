/**
 * Application Header Component
 * Displays app title, search bar, user info, and user menu dropdown
 */

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AppBar,
  Avatar,
  Box,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import SearchIcon from "@mui/icons-material/Search";
import { useAuth } from "../../contexts/AuthContext";
import { ROUTES } from "../../constants";
import "./Header.css";

const Header = ({ drawerWidth }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);
  const open = Boolean(anchorEl);

  // Get user info from localStorage as fallback
  let userInfo = { name: "User", role: "", profilePic: "" };
  try {
    const cu = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (cu) {
      userInfo.name = cu.name || (cu.email ? cu.email.split("@")[0] : "User");
      userInfo.role = cu.role ? cu.role.charAt(0).toUpperCase() + cu.role.slice(1) : "";
      userInfo.profilePic = cu.profilePic || "";
    }
  } catch (e) {
    // Use auth context user as fallback
    if (user) {
      userInfo.name = user.name || "User";
      userInfo.role = user.role || "";
    }
  }

  // Use auth context user if available, otherwise use localStorage user
  const displayUser = user || userInfo;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAnchorEl(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMyAccount = () => {
    handleMenuClose();
    // Navigate to my account when implemented
  };

  const handleProfile = () => {
    handleMenuClose();
    navigate(ROUTES.PROFILE);
  };

  const handleBilling = () => {
    handleMenuClose();
    // Navigate to billing when implemented
  };

  const handleSettings = () => {
    handleMenuClose();
    // Navigate to settings when implemented
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    // Also clear localStorage as in original Header.js
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("profileCreated");
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Handle search functionality
    if (searchQuery.trim()) {
      // Navigate to search results or perform search
      console.log("Searching for:", searchQuery);
    }
  };

  return (
    <AppBar
      position="fixed"
      color="primary"
      sx={{ width: `calc(100% - ${drawerWidth}px)`, ml: `${drawerWidth}px` }}
    >
      <Toolbar sx={{ justifyContent: "space-between", gap: 2 }}>
        <Box>
          <Typography variant="h6" component="div">
            SoftScale
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {t("layout.greeting", { name: displayUser?.name || "Guest" })}
          </Typography>
        </Box>

        {/* Search bar */}
        <Box
          component="form"
          onSubmit={handleSearch}
          sx={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            borderRadius: "20px",
            padding: "4px 12px",
            width: "300px",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.25)",
            },
          }}
        >
          <SearchIcon sx={{ color: "white", mr: 1 }} />
          <InputBase
            placeholder="Search candidates or clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              color: "white",
              width: "100%",
              "& .MuiInputBase-input": {
                color: "white",
                "&::placeholder": {
                  color: "rgba(255, 255, 255, 0.7)",
                  opacity: 1,
                },
              },
            }}
          />
        </Box>

        {/* Profile Section */}
        <Box
          ref={dropdownRef}
          sx={{ display: "flex", alignItems: "center", gap: 1, position: "relative" }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" sx={{ display: { xs: "none", sm: "block" } }}>
              {displayUser?.name || "Guest"}
            </Typography>
            {displayUser?.role && (
              <Typography variant="caption" sx={{ display: { xs: "none", md: "block" }, opacity: 0.8 }}>
                {displayUser.role}
              </Typography>
            )}
          </Box>
          <IconButton
            onClick={handleMenuOpen}
            size="small"
            sx={{ ml: 1 }}
            aria-controls={open ? "user-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
          >
            {displayUser?.profilePic ? (
              <Avatar
                src={displayUser.profilePic}
                alt="Profile"
                sx={{ width: 40, height: 40 }}
              />
            ) : (
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: "secondary.main",
                  backgroundColor: "#ff6b9a",
                }}
              >
                {getInitials(displayUser?.name)}
              </Avatar>
            )}
          </IconButton>
          <Menu
            id="user-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleMenuClose}
            onClick={handleMenuClose}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            sx={{ mt: 1 }}
          >
            <MenuItem onClick={handleMyAccount}>
              <AccountCircleIcon sx={{ mr: 1 }} />
              My Account
            </MenuItem>
            <MenuItem onClick={handleProfile}>
              <AccountCircleIcon sx={{ mr: 1 }} />
              {t("common.profile")}
            </MenuItem>
            <MenuItem onClick={handleBilling}>
              <SettingsIcon sx={{ mr: 1 }} />
              Billing
            </MenuItem>
            <MenuItem onClick={handleSettings}>
              <SettingsIcon sx={{ mr: 1 }} />
              {t("common.settings")}
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} />
              {t("common.logout")}
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;

