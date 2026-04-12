import React from "react";
import { useNavigate } from "react-router-dom";
import { Paper, Stack, Typography } from "@mui/material";
import { CompanyPostProjectForm } from "../../components/company/CompanyPostForms";
import { ROUTES } from "../../constants";
import { useTranslation } from "react-i18next";

const PostProjectPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1" color="text.secondary">
        {t("companyWorkspace.postProjectBlurb")}
      </Typography>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <CompanyPostProjectForm
          onSuccess={() => navigate(ROUTES.COMPANY_POSTINGS)}
          onCancel={() => navigate(ROUTES.COMPANY_POSTINGS)}
        />
      </Paper>
    </Stack>
  );
};

export default PostProjectPage;
