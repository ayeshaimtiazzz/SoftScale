/**
 * Company admin "My workspace": Profile | My posts (job/project actions live under Posts).
 */

import React, { Suspense } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Box, Stack, Tab, Tabs, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { ROUTES, UserRole, COLORS } from "../../constants";
import { useAuth } from "../../contexts/AuthContext";

const normalizeRole = (r) => {
  if (!r) return "";
  return String(r).toLowerCase().replace(/-/g, "_");
};

/** Profile first, then posts (matches user menu expectations). */
const TAB_PATHS = [ROUTES.COMPANY_PROFILE_SECTION, ROUTES.COMPANY_POSTINGS];

const LoadingOutlet = () => (
  <Typography variant="body2" sx={{ py: 2 }}>
    Loading...
  </Typography>
);

const CompanyWorkspaceLayout = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const role = normalizeRole(user?.role);
  const isCompanyAdmin = role === UserRole.COMPANY_ADMIN;

  let tabValue = TAB_PATHS.indexOf(location.pathname);
  if (tabValue === -1) {
    const p = location.pathname;
    if (
      p.startsWith(ROUTES.COMPANY_POSTINGS) ||
      p.includes("/post-job") ||
      p.includes("/post-project")
    ) {
      tabValue = 1;
    } else {
      tabValue = 0;
    }
  }

  if (!user) {
    return null;
  }

  if (!isCompanyAdmin) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  const handleTabChange = (_, newValue) => {
    navigate(TAB_PATHS[newValue]);
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          {t("companyWorkspace.title")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("companyWorkspace.subtitle")}
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 1 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
          variant="fullWidth"
          sx={{
            "& .MuiTab-root": { textTransform: "none", fontWeight: 600 },
            minHeight: 44,
          }}
        >
          <Tab label={t("companyWorkspace.tabProfile")} />
          <Tab label={t("companyWorkspace.tabPosts")} />
        </Tabs>
      </Box>

      <Box
        sx={{
          borderLeft: `4px solid ${COLORS.success.main}`,
          pl: { xs: 0, sm: 2 },
        }}
      >
        <Suspense fallback={<LoadingOutlet />}>
          <Outlet />
        </Suspense>
      </Box>
    </Stack>
  );
};

export default CompanyWorkspaceLayout;
