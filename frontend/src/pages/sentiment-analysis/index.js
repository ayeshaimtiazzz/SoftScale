import React from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import { COLORS } from "../../constants";
import PageTitle from "../../components/common/PageTitle";
import { useTranslation } from "react-i18next";

function SentimentAnalysis() {
  const { t } = useTranslation();
  return (
    <Box sx={{ p: 3 }}>
      <PageTitle
        title={t("navigation.sentimentAnalysis")}
        subtitle={t("navigation.sentimentAnalysisDesc")}
        icon={<AssessmentOutlinedIcon sx={{ fontSize: "2rem" }} />}
        color={COLORS.secondary.main}
      />
      <Card
        sx={{
          p: 3,
          transition: "all 0.3s ease",
          border: `1px solid ${COLORS.neutral.gray300}`,
          "&:hover": {
            borderColor: COLORS.info.main,
            boxShadow: `0 8px 24px ${COLORS.info.light}40`,
            transform: "translateY(-2px)",
            backgroundColor: `${COLORS.info.lightest}10`,
          },
        }}
      >
        <CardContent>
          <Typography variant="body1" sx={{ color: COLORS.neutral.gray600 }}>
            This feature is coming soon.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

export default SentimentAnalysis;



