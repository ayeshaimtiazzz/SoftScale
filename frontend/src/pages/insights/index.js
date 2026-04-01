import React from "react";
import { Box, Card, CardContent, Typography, Grid } from "@mui/material";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import AnalyticsOutlinedIcon from "@mui/icons-material/AnalyticsOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import { useNavigate } from "react-router-dom";
import { COLORS, ROUTES } from "../../constants";
import PageTitle from "../../components/common/PageTitle";
import { useTranslation } from "react-i18next";

function Insights() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
            onClick={() => navigate(ROUTES.SENTIMENT_ANALYSIS)}
            sx={{
              p: 3,
              height: "100%",
              cursor: "pointer",
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
            onClick={() => navigate(ROUTES.PRICE_PREDICTION)}
            sx={{
              p: 3,
              height: "100%",
              cursor: "pointer",
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

        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, cursor: "pointer" }} onClick={() => navigate(ROUTES.PROPOSAL_GENERATION)}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <HubOutlinedIcon sx={{ fontSize: 36, color: COLORS.accent.main, mr: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.accent.main }}>
                  Proposal Generation
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: COLORS.neutral.gray700 }}>
                Generate and refine proposals from deals and talent matches.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, cursor: "pointer" }} onClick={() => navigate(ROUTES.CRM)}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <ReceiptLongOutlinedIcon sx={{ fontSize: 36, color: COLORS.secondary.main, mr: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.secondary.main }}>
                  CRM Deals
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: COLORS.neutral.gray700 }}>
                Track stages, conversations, pricing predictions, and deal activity.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, cursor: "pointer" }} onClick={() => navigate(ROUTES.TALENT_MATCH)}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <GroupOutlinedIcon sx={{ fontSize: 36, color: COLORS.success.main, mr: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.success.main }}>
                  Talent Match
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: COLORS.neutral.gray700 }}>
                Match candidates with jobs/projects and create deal pipelines.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, cursor: "pointer" }} onClick={() => navigate(ROUTES.LEAD_DISCOVERY)}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <SearchOutlinedIcon sx={{ fontSize: 36, color: COLORS.info.main, mr: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.info.main }}>
                  Lead Discovery
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: COLORS.neutral.gray700 }}>
                Discover and qualify opportunities before they enter the deal pipeline.
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

