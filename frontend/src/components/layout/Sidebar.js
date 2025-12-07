/**
 * Sidebar Navigation Component
 * Displays navigation menu items in the drawer
 */

import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { List, ListItemIcon, ListItemText, Toolbar, Typography, Box, useTheme, Collapse } from "@mui/material";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { ROUTES, COLORS } from "../../constants";
import { StyledNavItemButton, StyledSubNavItemButton } from "./styles";

const NAV_ITEMS = [
  {
    key: "dashboard",
    labelKey: "navigation.dashboard",
    path: ROUTES.DASHBOARD,
    icon: <DashboardOutlinedIcon />,
    color: COLORS.info.main,
    bgColor: COLORS.info.lightest, // Light blue background
    description: "navigation.dashboardDesc",
  },
  {
    key: "leadDiscovery",
    labelKey: "navigation.leadDiscovery",
    path: ROUTES.TALENT_MATCH,
    icon: <SearchOutlinedIcon />,
    color: COLORS.success.main,
    bgColor: COLORS.success.lightest, // Light green background
    description: "navigation.leadDiscoveryDesc",
  },
  {
    key: "proposalGeneration",
    labelKey: "navigation.proposalGeneration",
    path: ROUTES.PROPOSAL_GENERATION,
    icon: <HubOutlinedIcon />,
    color: COLORS.accent.main,
    bgColor: COLORS.accent.lightest, // Light yellow background
    description: "navigation.proposalGenerationDesc",
  },
  {
    key: "crm",
    labelKey: "navigation.crm",
    path: ROUTES.CRM,
    icon: <ReceiptLongOutlinedIcon />,
    color: COLORS.secondary.main,
    bgColor: COLORS.secondary.lightest, // Light red background
    description: "navigation.crmDesc",
  },
  {
    key: "insights",
    labelKey: "navigation.insights",
    path: ROUTES.INSIGHTS,
    icon: <InsightsOutlinedIcon />,
    color: COLORS.info.dark,
    bgColor: COLORS.info.lighter, // Light blue background (different shade from dashboard)
    description: "navigation.insightsDesc",
    subItems: [
      {
        key: "sentimentAnalysis",
        labelKey: "navigation.sentimentAnalysis",
        path: ROUTES.SENTIMENT_ANALYSIS,
        icon: <AssessmentOutlinedIcon />,
        color: COLORS.info.main,
        bgColor: COLORS.info.lightest, // Light blue background
        description: "navigation.sentimentAnalysisDesc",
      },
      {
        key: "pricePrediction",
        labelKey: "navigation.pricePrediction",
        path: ROUTES.PRICE_PREDICTION,
        icon: <TrendingUpOutlinedIcon />,
        color: COLORS.accent.main,
        bgColor: COLORS.accent.lightest, // Light yellow background
        description: "navigation.pricePredictionDesc",
      },
    ],
  },
];

const Sidebar = ({ collapsed = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [expandedItems, setExpandedItems] = useState({});

  const handleNavigate = (path) => {
    navigate(path);
  };

  const handleExpandClick = (key) => {
    setExpandedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isItemSelected = (item) => {
    const isMainSelected = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
    if (item.subItems) {
      const isSubSelected = item.subItems.some((subItem) => location.pathname === subItem.path || location.pathname.startsWith(subItem.path + "/"));
      return isMainSelected || isSubSelected;
    }
    return isMainSelected;
  };

  const isSubItemSelected = (subItem) => {
    return location.pathname === subItem.path || location.pathname.startsWith(subItem.path + "/");
  };

  // Auto-expand insights if any sub-item is selected
  React.useEffect(() => {
    const insightsItem = NAV_ITEMS.find((item) => item.key === "insights");
    if (insightsItem?.subItems) {
      const hasSelectedSubItem = insightsItem.subItems.some(
        (subItem) => location.pathname === subItem.path || location.pathname.startsWith(subItem.path + "/")
      );
      if (hasSelectedSubItem) {
        setExpandedItems((prev) => {
          if (!prev.insights) {
            return { ...prev, insights: true };
          }
          return prev;
        });
      }
    }
  }, [location.pathname]);

  return (
    <Box
      component="nav"
      aria-label="Main navigation"
      sx={{
        height: "100%",
        backgroundColor: isDark ? theme.palette.background.paper : theme.palette.background.default,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Toolbar
        sx={{
          minHeight: "80px !important",
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.primary.main,
          justifyContent: collapsed ? "center" : "flex-start",
          px: collapsed ? 1.5 : 3,
          py: 2,
          position: "relative",
          "&::after": {
            content: '""',
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "1px",
            background: isDark
              ? `linear-gradient(90deg, transparent 0%, ${theme.palette.divider} 50%, transparent 100%)`
              : `linear-gradient(90deg, transparent 0%, ${theme.palette.divider} 50%, transparent 100%)`,
          },
        }}
      >
        {!collapsed ? (
          <Box sx={{ display: "flex", flexDirection: "column", width: "100%", gap: 0.5 }}>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{
                color: "white",
                fontSize: "1.35rem",
                letterSpacing: "0.03em",
                lineHeight: 1.2,
              }}
            >
              {t("common.appName", { defaultValue: "SoftScale" })}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: "0.7rem",
                fontWeight: 400,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Business Development Platform
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isDark
                  ? `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.dark} 100%)`
                  : `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.dark} 100%)`,
                boxShadow: `0 2px 8px ${COLORS.primary.main}30`,
              }}
            >
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{
                  color: "white",
                  fontSize: "1.1rem",
                  letterSpacing: "0.05em",
                }}
              >
                SS
              </Typography>
            </Box>
          </Box>
        )}
      </Toolbar>
      <List sx={{ px: collapsed ? 0.75 : 1.5, py: 2.5 }}>
        {NAV_ITEMS.map((item) => {
          const isSelected = isItemSelected(item);
          const isExpanded = expandedItems[item.key] || false;
          const hasSubItems = item.subItems && item.subItems.length > 0;

          return (
            <React.Fragment key={item.key}>
              <StyledNavItemButton
                id={hasSubItems ? `${item.key}-button` : undefined}
                selected={isSelected && !hasSubItems}
                onClick={() => {
                  if (hasSubItems && !collapsed) {
                    handleExpandClick(item.key);
                    // Also navigate to the main insights page
                    handleNavigate(item.path);
                  } else {
                    handleNavigate(item.path);
                  }
                }}
                aria-expanded={hasSubItems && !collapsed ? isExpanded : undefined}
                aria-controls={hasSubItems && !collapsed ? `${item.key}-submenu` : undefined}
                aria-label={t(item.labelKey)}
                title={collapsed ? t(item.labelKey) : undefined}
                itemColor={item.color}
                collapsed={collapsed}
                hasSubItems={hasSubItems}
                isDark={isDark}
              >
                <ListItemIcon
                  sx={{
                    color: item.color,
                    minWidth: collapsed ? 0 : 48,
                    justifyContent: "center",
                    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    position: "relative",
                    "& .MuiSvgIcon-root": {
                      fontSize: collapsed ? "1.5rem" : "1.4rem",
                      filter: `drop-shadow(0 1px 1px ${item.color}50) drop-shadow(0 0 2px ${item.color}30)`,
                      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    },
                  }}
                  aria-hidden="true"
                >
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <>
                    <ListItemText
                      primary={t(item.labelKey)}
                      secondary={item.description ? t(item.description) : undefined}
                      primaryTypographyProps={{
                        fontWeight: isSelected ? 600 : 500,
                        fontSize: "0.9375rem",
                        color: isSelected ? item.color : theme.palette.text.primary,
                        letterSpacing: "0.01em",
                        lineHeight: 1.4,
                        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                      secondaryTypographyProps={{
                        fontSize: "0.75rem",
                        color: isSelected ? `${item.color}DD` : theme.palette.text.secondary,
                        sx: { mt: 0.5 },
                        lineHeight: 1.3,
                        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                    />
                    {hasSubItems && (
                      <Box
                        sx={{
                          ml: 1,
                          display: "flex",
                          alignItems: "center",
                          transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                        aria-hidden="true"
                      >
                        {isExpanded ? (
                          <ExpandLess
                            sx={{
                              color: item.color,
                              fontSize: "1.25rem",
                              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                              filter: `drop-shadow(0 1px 1px ${item.color}50)`,
                            }}
                          />
                        ) : (
                          <ExpandMore
                            sx={{
                              color: item.color,
                              fontSize: "1.25rem",
                              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                              filter: `drop-shadow(0 1px 1px ${item.color}50)`,
                            }}
                          />
                        )}
                      </Box>
                    )}
                  </>
                )}
              </StyledNavItemButton>
              {hasSubItems && !collapsed && (
                <Collapse in={isExpanded} timeout="auto" unmountOnExit id={`${item.key}-submenu`} aria-labelledby={`${item.key}-button`}>
                  <List component="div" disablePadding sx={{ pl: 2, pr: 1 }}>
                    {item.subItems.map((subItem) => {
                      const isSubSelected = isSubItemSelected(subItem);
                      return (
                        <StyledSubNavItemButton
                          key={subItem.key}
                          selected={isSubSelected}
                          onClick={() => handleNavigate(subItem.path)}
                          aria-label={t(subItem.labelKey)}
                          itemColor={subItem.color}
                          isDark={isDark}
                        >
                          <ListItemIcon
                            sx={{
                              color: subItem.color,
                              minWidth: 40,
                              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                              position: "relative",
                              "& .MuiSvgIcon-root": {
                                fontSize: "1.25rem",
                                filter: `drop-shadow(0 1px 1px ${subItem.color}50) drop-shadow(0 0 2px ${subItem.color}30)`,
                                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                              },
                            }}
                            aria-hidden="true"
                          >
                            {subItem.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={t(subItem.labelKey)}
                            secondary={subItem.description ? t(subItem.description) : undefined}
                            primaryTypographyProps={{
                              fontWeight: isSubSelected ? 600 : 400,
                              fontSize: "0.875rem",
                              color: isSubSelected ? subItem.color : theme.palette.text.primary,
                              letterSpacing: "0.01em",
                              lineHeight: 1.4,
                              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                            }}
                            secondaryTypographyProps={{
                              fontSize: "0.7rem",
                              color: isSubSelected ? `${subItem.color}DD` : theme.palette.text.secondary,
                              sx: { mt: 0.4 },
                              lineHeight: 1.3,
                              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                            }}
                          />
                        </StyledSubNavItemButton>
                      );
                    })}
                  </List>
                </Collapse>
              )}
            </React.Fragment>
          );
        })}
      </List>
    </Box>
  );
};

export default Sidebar;

