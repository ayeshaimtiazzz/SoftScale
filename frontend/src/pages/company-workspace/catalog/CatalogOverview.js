import React from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../../constants";
import { JobDetailsView, ProjectDetailsView } from "../../talent-details/jobProjectViews";

const CatalogOverview = () => {
  const { t } = useTranslation();
  const { itemType, profileData, title, itemId, token } = useOutletContext();

  const typeColor = itemType === "project" ? COLORS.success : COLORS.info;
  const item = {
    type: itemType,
    id: itemId,
    title: title || "",
  };

  if (!profileData) {
    return <Typography color="text.secondary">{t("common.loading")}</Typography>;
  }

  return (
    <>
      <Card variant="outlined" sx={{ mb: 2, borderLeft: `4px solid ${typeColor.main}` }}>
        <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
            {t("companyPostings.catalogLinkedHeading")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {itemType === "project"
              ? t("companyPostings.catalogLinkedProjectBody")
              : t("companyPostings.catalogLinkedJobBody")}
          </Typography>
        </CardContent>
      </Card>
      {itemType === "job" ? (
        <JobDetailsView data={profileData} item={item} typeColor={typeColor} embedded />
      ) : (
        <ProjectDetailsView data={profileData} item={item} typeColor={typeColor} token={token} embedded />
      )}
    </>
  );
};

export default CatalogOverview;
