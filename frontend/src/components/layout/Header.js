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
  Badge,
  Box,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
  Divider,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel,
} from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import SearchIcon from "@mui/icons-material/Search";
import MenuIcon from "@mui/icons-material/Menu";
import PaymentIcon from "@mui/icons-material/Payment";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { useAuth } from "../../contexts/AuthContext";
import { useThemeMode } from "../../contexts/ThemeContext";
import { ROUTES, COLORS } from "../../constants";
import "./Header.css";

const Header = ({ drawerWidth, onMenuClick }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const open = Boolean(anchorEl);
  const notificationOpen = Boolean(notificationAnchorEl);

  // Mock notifications data - replace with real data later
  const [notifications] = useState([
    { id: 1, message: "New job application received", time: "2 minutes ago", read: false },
    { id: 2, message: "Profile update completed", time: "1 hour ago", read: false },
    { id: 3, message: "Payment received", time: "3 hours ago", read: true },
    { id: 4, message: "New match found", time: "1 day ago", read: true },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

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
    setTimeout(() => {
      navigate(ROUTES.PROFILE);
    }, 0);
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
    // Clear all localStorage items first
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("profileCreated");
    localStorage.removeItem("userRole");
    // Call logout from context
    logout();
    // Navigate to login page
    setTimeout(() => {
      navigate(ROUTES.LOGIN, { replace: true });
    }, 0);
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
    <AppBar position="fixed" color="primary" sx={{ width: `calc(100% - ${drawerWidth}px)`, ml: `${drawerWidth}px` }}>
      <Toolbar sx={{ justifyContent: "space-between", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton color="inherit" aria-label="toggle drawer" edge="start" onClick={onMenuClick} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div">
            SoftScale
          </Typography>
        </Box>

        {/* Search bar */}
        <Box
          component="form"
          onSubmit={handleSearch}
          sx={{
            display: { xs: "none", sm: "flex" },
            alignItems: "center",
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            borderRadius: "20px",
            padding: "4px 12px",
            width: { sm: "250px", md: "300px" },
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

        {/* Right side actions */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Theme Toggle */}
          <IconButton onClick={toggleTheme} color="inherit" aria-label="toggle theme" sx={{ mr: 1 }}>
            {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>

          {/* Notifications */}
          <Box ref={notificationRef}>
            <IconButton onClick={(e) => setNotificationAnchorEl(e.currentTarget)} color="inherit" aria-label="notifications" sx={{ mr: 1 }}>
              <Badge badgeContent={unreadCount} color="error">
                {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
              </Badge>
            </IconButton>
            <Menu
              anchorEl={notificationAnchorEl}
              open={notificationOpen}
              onClose={() => setNotificationAnchorEl(null)}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              PaperProps={{
                sx: {
                  borderRadius: 2,
                  minWidth: 320,
                  maxWidth: 400,
                  maxHeight: 400,
                  boxShadow: `0 4px 16px ${COLORS.neutral.gray300}40`,
                },
              }}
            >
              <MenuItem disabled>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" fontWeight={600}>
                      Recent Activities
                    </Typography>
                  }
                />
              </MenuItem>
              <Divider />
              {notifications.length === 0 ? (
                <MenuItem disabled>
                  <ListItemText primary="No notifications" />
                </MenuItem>
              ) : (
                notifications.map((notification) => (
                  <MenuItem
                    key={notification.id}
                    onClick={() => setNotificationAnchorEl(null)}
                    sx={{
                      backgroundColor: notification.read ? "transparent" : `${COLORS.primary.lightest}20`,
                      "&:hover": {
                        backgroundColor: `${COLORS.primary.lightest}40`,
                      },
                    }}
                  >
                    <ListItemIcon>
                      <NotificationsIcon fontSize="small" sx={{ color: notification.read ? COLORS.neutral.gray400 : COLORS.primary.main }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={notification.message}
                      secondary={notification.time}
                      primaryTypographyProps={{
                        fontWeight: notification.read ? 400 : 600,
                        fontSize: "0.875rem",
                      }}
                      secondaryTypographyProps={{
                        fontSize: "0.75rem",
                      }}
                    />
                  </MenuItem>
                ))
              )}
            </Menu>
          </Box>

          {/* Profile Section */}
          <Box ref={dropdownRef} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", mr: 1 }}>
              <Typography variant="body2" sx={{ display: { xs: "none", sm: "block" }, fontWeight: 500 }}>
                {displayUser?.name || "Guest"}
              </Typography>
              {displayUser?.role && (
                <Typography variant="caption" sx={{ display: { xs: "none", sm: "block" }, opacity: 0.7 }}>
                  {displayUser.role}
                </Typography>
              )}
            </Box>
            <IconButton
              onClick={handleMenuOpen}
              size="small"
              aria-controls={open ? "user-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={open ? "true" : undefined}
            >
              {displayUser?.profilePic ? (
                <Avatar src={displayUser.profilePic} alt="Profile" sx={{ width: 40, height: 40 }} />
              ) : (
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    background: `linear-gradient(135deg, ${COLORS.secondary.main} 0%, ${COLORS.secondary.dark} 100%)`,
                  }}
                >
                  {getInitials(displayUser?.name)}
                </Avatar>
              )}
            </IconButton>
          </Box>
          <Menu
            id="user-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleMenuClose}
            onClick={(e) => e.stopPropagation()}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            sx={{ mt: 1, zIndex: 1300 }}
            PaperProps={{
              sx: {
                borderRadius: 2,
                minWidth: 200,
                boxShadow: `0 4px 16px ${COLORS.neutral.gray300}40`,
                zIndex: 1300,
              },
            }}
            MenuListProps={{
              onClick: (e) => e.stopPropagation(),
            }}
          >
            <MenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMyAccount();
              }}
              sx={{
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: `${COLORS.primary.lightest}60`,
                  "& .MuiSvgIcon-root": { color: COLORS.primary.main },
                },
              }}
            >
              <AccountCircleIcon sx={{ mr: 1, color: COLORS.primary.main }} />
              My Account
            </MenuItem>
            <MenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleProfile();
              }}
              sx={{
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: `${COLORS.success.lightest}60`,
                  "& .MuiSvgIcon-root": { color: COLORS.success.main },
                },
              }}
            >
              <AccountCircleIcon sx={{ mr: 1, color: COLORS.success.main }} />
              {t("common.profile")}
            </MenuItem>
            <MenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleBilling();
              }}
              sx={{
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: `${COLORS.accent.lightest}60`,
                  "& .MuiSvgIcon-root": { color: COLORS.accent.main },
                },
              }}
            >
              <PaymentIcon sx={{ mr: 1, color: COLORS.accent.main }} />
              Billing
            </MenuItem>
            <MenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSettings();
              }}
              sx={{
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: `${COLORS.primary.lightest}60`,
                  "& .MuiSvgIcon-root": { color: COLORS.primary.main },
                },
              }}
            >
              <SettingsIcon sx={{ mr: 1, color: COLORS.primary.dark }} />
              {t("common.settings")}
            </MenuItem>
            <Divider />
            <MenuItem
              sx={{
                "&:hover": {
                  backgroundColor: "transparent",
                },
              }}
            >
              <ListItemIcon>
                {mode === "dark" ? <Brightness7Icon sx={{ color: COLORS.accent.main }} /> : <Brightness4Icon sx={{ color: COLORS.primary.main }} />}
              </ListItemIcon>
              <FormControlLabel
                control={<Switch checked={mode === "dark"} onChange={toggleTheme} size="small" />}
                label={mode === "dark" ? "Dark Mode" : "Light Mode"}
                sx={{ m: 0 }}
              />
            </MenuItem>
            <MenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleLogout();
              }}
              sx={{
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: `${COLORS.secondary.lightest}60`,
                  "& .MuiSvgIcon-root": { color: COLORS.secondary.main },
                },
              }}
            >
              <LogoutIcon sx={{ mr: 1, color: COLORS.secondary.main }} />
              {t("common.logout")}
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;

