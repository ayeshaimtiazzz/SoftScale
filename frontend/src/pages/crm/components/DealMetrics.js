/**
 * Deal Metrics Component
 * Displays key performance metrics for deal management
 */

import React from "react";
import { Grid, Card, CardContent, Box, Typography, CircularProgress } from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
  Percent as PercentIcon,
} from "@mui/icons-material";
import { COLORS } from "../../../constants";

const DealMetrics = ({ metrics, loading }) => {
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

  if (!metrics) {
    return null;
  }

  const metricCards = [
    {
      label: "Total Deals",
      value: metrics.totalDeals || 0,
      icon: AssessmentIcon,
      color: COLORS.info,
      suffix: "",
    },
    {
      label: "Active Deals",
      value: metrics.activeDeals || 0,
      icon: TrendingUpIcon,
      color: COLORS.success,
      suffix: "",
    },
    {
      label: "Total Value",
      value: `$${((metrics.totalValue || 0) / 1000).toFixed(0)}K`,
      icon: MoneyIcon,
      color: COLORS.accent,
      suffix: "",
    },
    {
      label: "Win Rate",
      value: `${(metrics.winRate || 0).toFixed(1)}%`,
      icon: PercentIcon,
      color: COLORS.secondary,
      suffix: "",
    },
    {
      label: "Closed Won",
      value: metrics.closedWon || 0,
      icon: CheckCircleIcon,
      color: COLORS.success,
      suffix: "",
    },
    {
      label: "Avg Deal Duration",
      value: `${metrics.avgDealDuration || 0}`,
      icon: ScheduleIcon,
      color: COLORS.primary,
      suffix: " days",
    },
  ];

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {metricCards.map((metric, index) => {
        const IconComponent = metric.icon;
        return (
          <Grid item xs={12} sm={6} md={4} lg={2} key={`metric-${index}`}>
            <Card
              sx={{
                borderLeft: `4px solid ${metric.color.main}`,
                borderTop: `1px solid ${metric.color.light}`,
                borderRight: `1px solid ${metric.color.light}`,
                borderBottom: `1px solid ${metric.color.light}`,
                boxShadow: `0 4px 12px ${metric.color.lighter}30`,
                backgroundColor: `${metric.color.lightest}10`,
                transition: "all 0.3s ease",
                height: "100%",
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
                      fontSize: "2rem",
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
                    fontSize: "1.5rem",
                  }}
                >
                  {metric.value}
                  {metric.suffix && (
                    <Typography component="span" variant="body2" sx={{ ml: 0.5, fontWeight: 400 }}>
                      {metric.suffix}
                    </Typography>
                  )}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default DealMetrics;

