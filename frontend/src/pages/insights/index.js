import React from "react";
import { Box, Card, CardContent, Typography, Grid } from "@mui/material";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import AnalyticsOutlinedIcon from "@mui/icons-material/AnalyticsOutlined";
import { COLORS } from "../../constants";
import PageTitle from "../../components/common/PageTitle";
import { useTranslation } from "react-i18next";

function Insights() {
  const { t } = useTranslation();
  return (
    <Box sx={{ p: 3 }}>
      <PageTitle
        title={t("navigation.insights")}
        subtitle={t("navigation.insightsDesc")}
        icon={<InsightsOutlinedIcon sx={{ fontSize: "2rem" }} />}
        color={COLORS.secondary.main}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              p: 3,
              height: "100%",
              transition: "all 0.3s ease",
              border: `2px solid ${COLORS.secondary.light}`,
              background: `linear-gradient(135deg, ${COLORS.secondary.lightest} 0%, ${COLORS.secondary.lighter} 100%)`,
              "&:hover": {
                borderColor: COLORS.secondary.main,
                boxShadow: `0 8px 24px ${COLORS.secondary.main}30`,
                transform: "translateY(-4px)",
              },
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <AssessmentOutlinedIcon sx={{ fontSize: 40, color: COLORS.secondary.main, mr: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.secondary.main }}>
                  Sentiment Analysis
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: COLORS.neutral.gray700, mb: 2 }}>
                Analyze client communications and feedback to understand sentiment and engagement levels.
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.neutral.gray600, fontStyle: "italic" }}>
                Helps identify high-intent prospects and optimize communication strategies.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card
            sx={{
              p: 3,
              height: "100%",
              transition: "all 0.3s ease",
              border: `2px solid ${COLORS.info.light}`,
              background: `linear-gradient(135deg, ${COLORS.info.lightest} 0%, ${COLORS.info.lighter} 100%)`,
              "&:hover": {
                borderColor: COLORS.info.main,
                boxShadow: `0 8px 24px ${COLORS.info.main}30`,
                transform: "translateY(-4px)",
              },
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <TrendingUpIcon sx={{ fontSize: 40, color: COLORS.info.main, mr: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.info.main }}>
                  Price Prediction
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: COLORS.neutral.gray700, mb: 2 }}>
                Predict optimal pricing for proposals based on market data, project complexity, and client history.
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.neutral.gray600, fontStyle: "italic" }}>
                Maximize win rates while maintaining competitive pricing.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card
            sx={{
              p: 3,
              transition: "all 0.3s ease",
              border: `2px solid ${COLORS.accent.light}`,
              background: `linear-gradient(135deg, ${COLORS.accent.lightest} 0%, ${COLORS.accent.lighter} 100%)`,
              "&:hover": {
                borderColor: COLORS.accent.main,
                boxShadow: `0 8px 24px ${COLORS.accent.main}30`,
                transform: "translateY(-4px)",
              },
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <AnalyticsOutlinedIcon sx={{ fontSize: 40, color: COLORS.accent.main, mr: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.accent.main }}>
                  Deal Optimization
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: COLORS.neutral.gray700 }}>
                Get AI-powered recommendations to optimize your deals, improve conversion rates, and identify the best opportunities.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card
        sx={{
          mt: 4,
          p: 4,
          textAlign: "center",
          background: `linear-gradient(135deg, ${COLORS.secondary.lightest} 0%, ${COLORS.secondary.lighter} 100%)`,
          border: `1px solid ${COLORS.secondary.light}`,
        }}
      >
        <InsightsOutlinedIcon sx={{ fontSize: 64, color: COLORS.secondary.main, mb: 2 }} />
        <Typography variant="h6" sx={{ mb: 1, color: COLORS.secondary.main, fontWeight: 600 }}>
          Advanced Analytics Coming Soon
        </Typography>
        <Typography variant="body2" sx={{ color: COLORS.neutral.gray600 }}>
          Comprehensive insights and analytics dashboard to help you make data-driven business development decisions.
        </Typography>
      </Card>
    </Box>
  );
}

export default Insights;

