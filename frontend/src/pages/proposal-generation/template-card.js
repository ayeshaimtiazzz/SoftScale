import React from "react";
import { Card, CardContent, Typography, Button, Box, Chip } from "@mui/material";
import { COLORS } from "../../constants";

export default function TemplateCard({ template, onUse, onPreview, active = false }) {
  return (
    <Card
      sx={{
        border: `2px solid ${active ? COLORS.info.main : COLORS.neutral.gray300}`,
        backgroundColor: active ? `${COLORS.info.lightest}20` : COLORS.neutral.white,
        transition: "all 0.3s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: `0 4px 12px ${COLORS.info.light}40`,
          borderColor: COLORS.info.main,
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: COLORS.neutral.gray900 }}>
            {template.title}
          </Typography>
        </Box>
        <Chip
          label={template.category}
          size="small"
          sx={{
            mb: 1,
            backgroundColor: `${COLORS.info.lightest}30`,
            color: COLORS.info.dark,
            fontWeight: 500,
          }}
        />
        <Typography variant="body2" sx={{ color: COLORS.neutral.gray600, mb: 2, minHeight: "40px" }}>
          {template.description}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={onPreview}
            sx={{
              borderColor: COLORS.neutral.gray300,
              color: COLORS.neutral.gray700,
              "&:hover": {
                borderColor: COLORS.info.main,
                backgroundColor: `${COLORS.info.lightest}20`,
              },
            }}
          >
            Preview
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={onUse}
            sx={{
              flex: 1,
              background: `linear-gradient(135deg, ${COLORS.info.main} 0%, ${COLORS.info.dark} 100%)`,
              "&:hover": {
                background: `linear-gradient(135deg, ${COLORS.info.dark} 0%, ${COLORS.info.darker} 100%)`,
              },
            }}
          >
            Use
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
