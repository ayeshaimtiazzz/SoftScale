import React from "react";
import { Box, Card, CardContent, Grid, Typography, CircularProgress } from "@mui/material";
import {
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  Handshake as HandshakeIcon,
  Work as WorkIcon,
  Assignment as AssignmentIcon,
  Bookmark as BookmarkIcon,
  Visibility as VisibilityIcon,
  Business as BusinessIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../constants";

/**
 * MetricCards Component
 * Displays role-specific metric cards for the dashboard
 */
const MetricCards = ({ metrics, loading, role }) => {
  const { t } = useTranslation();

  // Get role-specific metric cards configuration
  const getMetricCards = () => {
    if (!metrics || loading) {
      return [];
    }

    if (role === "company_admin" || role === "company") {
      return [
        {
          label: t("dashboard.activeCandidates"),
          value: metrics.activeCandidates || 0,
          color: COLORS.info,
          icon: PeopleIcon,
        },
        {
          label: t("dashboard.activeJobs"),
          value: metrics.activeJobs || 0,
          color: COLORS.success,
          icon: WorkIcon,
        },
        {
          label: t("dashboard.activeProjects"),
          value: metrics.activeProjects || 0,
          color: COLORS.accent,
          icon: AssignmentIcon,
        },
        {
          label: t("dashboard.totalPosts"),
          value: metrics.totalPosts || 0,
          color: COLORS.secondary,
          icon: BusinessIcon,
        },
      ];
    } else if (role === "freelancer") {
      return [
        {
          label: t("dashboard.availableJobs"),
          value: metrics.availableJobs || 0,
          color: COLORS.info,
          icon: WorkIcon,
        },
        {
          label: t("dashboard.availableProjects"),
          value: metrics.availableProjects || 0,
          color: COLORS.success,
          icon: AssignmentIcon,
        },
        {
          label: t("dashboard.totalOpportunities"),
          value: metrics.totalOpportunities || 0,
          color: COLORS.accent,
          icon: TrendingUpIcon,
        },
        {
          label: t("dashboard.profileViews"),
          value: metrics.profileViews || 0,
          color: COLORS.secondary,
          icon: VisibilityIcon,
        },
      ];
    } else if (role === "job_seeker" || role === "jobseeker") {
      return [
        {
          label: t("dashboard.availableJobs"),
          value: metrics.availableJobs || 0,
          color: COLORS.info,
          icon: WorkIcon,
        },
        {
          label: t("dashboard.appliedJobs"),
          value: metrics.appliedJobs || 0,
          color: COLORS.success,
          icon: HandshakeIcon,
        },
        {
          label: t("dashboard.savedJobs"),
          value: metrics.savedJobs || 0,
          color: COLORS.accent,
          icon: BookmarkIcon,
        },
        {
          label: t("dashboard.profileViews"),
          value: metrics.profileViews || 0,
          color: COLORS.secondary,
          icon: VisibilityIcon,
        },
      ];
    }
    return [];
  };

  const metricCards = getMetricCards();

  // Show loading state
  if (loading) {
    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
            <CircularProgress />
          </Box>
        </Grid>
      </Grid>
    );
  }

  // Show empty state if no metrics or no cards
  if (!metrics || metricCards.length === 0) {
    return null;
  }

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {metricCards.map((metric, index) => {
        const IconComponent = metric.icon;
        return (
          <Grid item xs={12} sm={6} md={3} key={`${metric.label}-${index}`}>
            <Card
              sx={{
                borderLeft: `4px solid ${metric.color.main}`,
                borderTop: `1px solid ${metric.color.light}`,
                borderRight: `1px solid ${metric.color.light}`,
                borderBottom: `1px solid ${metric.color.light}`,
                boxShadow: `0 4px 12px ${metric.color.lighter}30`,
                backgroundColor: `${metric.color.lightest}10`,
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: `0 8px 24px ${metric.color.light}50`,
                  borderLeft: `4px solid ${metric.color.dark}`,
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <IconComponent
                    sx={{
                      fontSize: "2.5rem",
                      color: metric.color.main,
                    }}
                  />
                </Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: metric.color.dark,
                    fontWeight: 500,
                    mb: 1,
                    fontSize: "0.875rem",
                  }}
                >
                  {metric.label}
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    color: metric.color.dark,
                    fontWeight: 700,
                    fontSize: "1.75rem",
                  }}
                >
                  {metric.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default MetricCards;

