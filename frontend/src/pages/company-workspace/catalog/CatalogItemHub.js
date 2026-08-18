/**
 * Persistent shell for one company job/project: sub-routes keep context (Lead Discovery, price, prospects, activity).
 */
import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Breadcrumbs,
  Chip,
  CircularProgress,
  Link,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { API_BASE } from "config";
import { ROUTES, companyCatalogItemPath } from "../../../constants";
import { useAuth } from "../../../contexts/AuthContext";

const normalizeType = (t) => {
  const s = String(t || "").toLowerCase();
  if (s === "project" || s === "projects") return "project";
  return "job";
};

const CatalogItemHub = () => {
  const { t } = useTranslation();
  const { itemType: rawType, itemId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();

  const itemType = normalizeType(rawType);
  const idNum = itemId != null && !Number.isNaN(Number(itemId)) ? Number(itemId) : null;

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (idNum == null) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const headers = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;
        const { data } = await axios.get(`${API_BASE}/profile/${idNum}`, {
          headers,
          params: { type: itemType },
        });
        const row = data?.data || data;
        if (!cancelled) setProfileData(row || null);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.detail || e.message || t("companyPostings.catalogLoadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [idNum, itemType, token, t]);

  const title = useMemo(() => {
    if (!profileData) return "";
    return (
      profileData.title ||
      profileData.job_title ||
      profileData.project_title ||
      (itemType === "job" ? `Job #${idNum}` : `Project #${idNum}`)
    );
  }, [profileData, itemType, idNum]);

  const segments = useMemo(
    () =>
      itemType === "project"
        ? ["overview", "lead-discovery", "prospects", "price", "rankings", "activity"]
        : ["overview", "lead-discovery", "prospects", "rankings", "activity"],
    [itemType]
  );

  const currentSegment = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    const seg = parts[parts.length - 1];
    const allowed = new Set(segments);
    return allowed.has(seg) ? seg : "overview";
  }, [location.pathname, segments]);

  useEffect(() => {
    if (itemType === "job" && currentSegment === "price") {
      navigate(companyCatalogItemPath("job", itemId, "overview"), { replace: true });
    }
  }, [itemType, currentSegment, navigate, itemId]);

  const tabLabel = (seg) => {
    switch (seg) {
      case "overview":
        return t("companyWorkspace.catalogTabOverview");
      case "lead-discovery":
        return t("companyWorkspace.catalogTabLeadDiscovery");
      case "prospects":
        return t("companyWorkspace.catalogTabProspects");
      case "price":
        return t("companyWorkspace.catalogTabPrice");
      case "rankings":
        return t("companyWorkspace.catalogTabRankings");
      case "activity":
        return t("companyWorkspace.catalogTabActivity");
      default:
        return seg;
    }
  };

  const ctx = useMemo(
    () => ({
      itemType,
      itemId: idNum,
      itemIdParam: itemId,
      profileData,
      title,
      token,
    }),
    [itemType, idNum, itemId, profileData, title, token]
  );

  if (idNum == null) {
    return <Navigate to={ROUTES.COMPANY_POSTINGS} replace />;
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" sx={{ py: 2 }}>
        {typeof error === "string" ? error : t("companyPostings.catalogLoadError")}
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      <Breadcrumbs aria-label="breadcrumb">
        <Link
          component="button"
          type="button"
          underline="hover"
          color="inherit"
          onClick={() => navigate(ROUTES.COMPANY_POSTINGS)}
          sx={{ cursor: "pointer" }}
        >
          {t("companyWorkspace.tabPosts")}
        </Link>
        <Typography color="text.primary" sx={{ fontWeight: 600 }}>
          {title || "—"}
        </Typography>
      </Breadcrumbs>

      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Chip
          size="small"
          label={itemType === "project" ? t("companyPostings.projectsTab") : t("companyPostings.jobsTab")}
          color={itemType === "project" ? "success" : "primary"}
          sx={{ fontWeight: 600 }}
        />
        <Chip size="small" variant="outlined" label={`ID ${idNum}`} />
      </Stack>

      <Tabs
        value={currentSegment}
        onChange={(_, val) => navigate(companyCatalogItemPath(itemType, itemId, val))}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        {segments.map((seg) => (
          <Tab key={seg} value={seg} label={tabLabel(seg)} sx={{ textTransform: "none", fontWeight: 600 }} />
        ))}
      </Tabs>

      <Box sx={{ pt: 1 }}>
        <Outlet context={ctx} />
      </Box>
    </Stack>
  );
};

export default CatalogItemHub;
