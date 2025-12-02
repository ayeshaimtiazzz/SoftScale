import React from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { COLORS } from "../../constants";
import PageTitle from "../../components/common/PageTitle";
import { useTranslation } from "react-i18next";

function CRM() {
  const { t } = useTranslation();
  return (
    <Box sx={{ p: 3 }}>
      <PageTitle
        title={t("navigation.crm")}
        subtitle={t("navigation.crmDesc")}
        icon={<ReceiptLongOutlinedIcon sx={{ fontSize: "2rem" }} />}
        color={COLORS.secondary.main}
      />
      <Card
        sx={{
          p: 3,
          transition: "all 0.3s ease",
          border: `1px solid ${COLORS.neutral.gray300}`,
          "&:hover": {
            borderColor: COLORS.secondary.main,
            boxShadow: `0 8px 24px ${COLORS.secondary.light}40`,
            transform: "translateY(-2px)",
            backgroundColor: `${COLORS.secondary.lightest}10`,
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

export default CRM;
