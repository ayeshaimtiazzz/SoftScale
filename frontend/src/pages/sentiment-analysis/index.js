import React from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";
import { COLORS } from "../../constants";

function SentimentAnalysis() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, color: COLORS.secondary.main }}>
        Sentiment Analysis
      </Typography>
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



