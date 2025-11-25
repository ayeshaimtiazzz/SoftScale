/**
 * Sidebar Navigation Component
 * Displays navigation menu items in the drawer
 */

import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Divider, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Box, useTheme } from "@mui/material";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import { ROUTES, COLORS } from "../../constants";

const NAV_ITEMS = [
  {
    key: "dashboard",
    labelKey: "navigation.dashboard",
    path: ROUTES.DASHBOARD,
    icon: <DashboardOutlinedIcon />,
    color: COLORS.info.main, // Blue
    bgColor: COLORS.info.lightest, // Blue lightest
  },
  {
    key: "talentMatch",
    labelKey: "navigation.talentMatch",
    path: ROUTES.TALENT_MATCH,
    icon: <PeopleAltOutlinedIcon />,
    color: COLORS.success.main,
    bgColor: COLORS.success.lightest,
  },
  {
    key: "proposalGeneration",
    labelKey: "navigation.proposalGeneration",
    path: ROUTES.PROPOSAL_GENERATION,
    icon: <HubOutlinedIcon />,
    color: COLORS.accent.main,
    bgColor: COLORS.accent.lightest,
  },
  {
    key: "sentimentAnalysis",
    labelKey: "navigation.sentimentAnalysis",
    path: ROUTES.SENTIMENT_ANALYSIS,
    icon: <AssessmentOutlinedIcon />,
    color: COLORS.secondary.main,
    bgColor: COLORS.secondary.lightest,
  },
  {
    key: "pricePrediction",
    labelKey: "navigation.pricePrediction",
    path: ROUTES.PRICE_PREDICTION,
    icon: <InsightsOutlinedIcon />,
    color: COLORS.info.main, // Blue
    bgColor: COLORS.info.lightest, // Blue lightest
  },
  {
    key: "crm",
    labelKey: "navigation.crm",
    path: ROUTES.CRM,
    icon: <ReceiptLongOutlinedIcon />,
    color: COLORS.success.light,
    bgColor: COLORS.success.lighter,
  },
  {
    key: "profile",
    labelKey: "navigation.profile",
    path: ROUTES.PROFILE,
    icon: <WorkspacePremiumOutlinedIcon />,
    color: COLORS.accent.light,
    bgColor: COLORS.accent.lighter,
  },
];

const Sidebar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const handleNavigate = (path) => {
    navigate(path);
  };

  return (
    <Box
      sx={{
        height: "100%",
        backgroundColor: isDark ? theme.palette.background.paper : COLORS.neutral.gray100,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Toolbar>
        <Typography variant="subtitle1" fontWeight={600} sx={{ color: isDark ? theme.palette.text.primary : COLORS.neutral.gray900 }}>
          {t("common.appName", { defaultValue: "SoftScale" })}
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: isDark ? COLORS.neutral.gray700 : COLORS.neutral.gray300 }} />
      <List>
        {NAV_ITEMS.map((item) => {
          const isSelected = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.key}
              selected={isSelected}
              onClick={() => handleNavigate(item.path)}
              sx={{
                borderRadius: 0,
                mx: 0,
                mb: 0,
                px: 2,
                py: 1.5,
                "&.Mui-selected": {
                  backgroundColor: isDark ? `${item.color}30` : `${item.bgColor}80`,
                  color: isDark ? item.color : item.color,
                  borderLeft: `4px solid ${item.color}`,
                  "&:hover": {
                    backgroundColor: isDark ? `${item.color}40` : `${item.bgColor}90`,
                  },
                  "& .MuiListItemIcon-root": {
                    color: item.color,
                  },
                },
                "&:hover": {
                  backgroundColor: isDark ? `${COLORS.neutral.gray700}60` : `${item.bgColor}40`,
                  "& .MuiListItemIcon-root": {
                    color: item.color,
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: isSelected ? item.color : isDark ? theme.palette.text.secondary : COLORS.neutral.gray600,
                  minWidth: 40,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={t(item.labelKey)}
                primaryTypographyProps={{
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? item.color : isDark ? theme.palette.text.primary : "inherit",
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
};

export default Sidebar;

