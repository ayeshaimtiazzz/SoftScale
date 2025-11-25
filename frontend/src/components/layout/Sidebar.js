/**
 * Sidebar Navigation Component
 * Displays navigation menu items in the drawer
 */

import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import { ROUTES } from "../../constants";

const NAV_ITEMS = [
  {
    key: "dashboard",
    labelKey: "navigation.dashboard",
    path: ROUTES.DASHBOARD,
    icon: <DashboardOutlinedIcon />,
  },
  {
    key: "talentMatch",
    labelKey: "navigation.talentMatch",
    path: ROUTES.TALENT_MATCH,
    icon: <PeopleAltOutlinedIcon />,
  },
  {
    key: "proposalGeneration",
    labelKey: "navigation.proposalGeneration",
    path: ROUTES.PROPOSAL_GENERATION,
    icon: <HubOutlinedIcon />,
  },
  {
    key: "sentimentAnalysis",
    labelKey: "navigation.sentimentAnalysis",
    path: ROUTES.SENTIMENT_ANALYSIS,
    icon: <AssessmentOutlinedIcon />,
  },
  {
    key: "pricePrediction",
    labelKey: "navigation.pricePrediction",
    path: ROUTES.PRICE_PREDICTION,
    icon: <InsightsOutlinedIcon />,
  },
  {
    key: "crm",
    labelKey: "navigation.crm",
    path: ROUTES.CRM,
    icon: <ReceiptLongOutlinedIcon />,
  },
  {
    key: "profile",
    labelKey: "navigation.profile",
    path: ROUTES.PROFILE,
    icon: <WorkspacePremiumOutlinedIcon />,
  },
];

const Sidebar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path) => {
    navigate(path);
  };

  return (
    <>
      <Toolbar>
        <Typography variant="subtitle1" fontWeight={600}>
          {t("common.appName", { defaultValue: "SoftScale" })}
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {NAV_ITEMS.map((item) => (
          <ListItemButton
            key={item.key}
            selected={location.pathname === item.path}
            onClick={() => handleNavigate(item.path)}
          >
            {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
            <ListItemText primary={t(item.labelKey)} />
          </ListItemButton>
        ))}
      </List>
    </>
  );
};

export default Sidebar;

