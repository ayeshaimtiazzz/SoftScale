import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  Paper,
  useTheme,
} from "@mui/material";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PeopleIcon from "@mui/icons-material/People";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { API_BASE } from "config";
import { ROUTES, UserRole, COLORS } from "../../constants";
import { useAuth } from "../../contexts/AuthContext";
import TopJobsProjects from "../dashboard/top-jobs-projects";
import ProspectsModal from "../dashboard/ProspectsModal";

const normalizeRole = (r) => {
  if (!r) return "";
  return String(r).toLowerCase().replace(/-/g, "_");
};

const isJobRow = (p) => p?.type === "job";
const isProjectRow = (p) => p?.type === "projects" || p?.type === "project";

const normalizeTypeForMatch = (item) => {
  if (item?.type === "projects") return "project";
  return item?.type || "job";
};

const getItemType = (item) => {
  if (item?.type === "job" || item?.job_id) return "job";
  if (item?.type === "project" || item?.type === "projects" || item?.project_id) return "project";
  return null;
};

const orderDetailKeys = (obj) => {
  const preferred = ["type", "id", "title", "domain"];
  const keys = Object.keys(obj || {});
  const rest = keys.filter((k) => !preferred.includes(k)).sort();
  return [...preferred.filter((k) => keys.includes(k)), ...rest];
};

const CompanyPostingsPage = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [viewMode, setViewMode] = useState("table");
  const [detailItem, setDetailItem] = useState(null);
  const fetchRef = useRef(false);

  const [prospectsModal, setProspectsModal] = useState({
    open: false,
    jobId: null,
    projectId: null,
    itemTitle: "",
  });

  const role = normalizeRole(user?.role);
  const isCompanyAdmin = role === UserRole.COMPANY_ADMIN;

  useEffect(() => {
    if (!isCompanyAdmin || !user?.user_id || !token) {
      setLoading(false);
      return;
    }
    if (fetchRef.current) return;
    fetchRef.current = true;
    setLoading(true);
    const load = async () => {
      try {
        const response = await axios.get(`${API_BASE}/get-company-posts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPosts(response.data.posts || []);
      } catch (e) {
        console.error("Failed to load company postings:", e);
        setPosts([]);
      } finally {
        setLoading(false);
        fetchRef.current = false;
      }
    };
    load();
  }, [isCompanyAdmin, user?.user_id, token]);

  const jobs = useMemo(() => posts.filter(isJobRow), [posts]);
  const projects = useMemo(() => posts.filter(isProjectRow), [posts]);

  const currentList = tab === 0 ? jobs : projects;

  const openTalentMatch = (item) => {
    const itemType = normalizeTypeForMatch(item);
    const itemId = item.id;
    const itemTitle = item.title || "";
    if (!itemType || itemId == null) return;
    localStorage.setItem("selectedPost", JSON.stringify({ type: itemType, id: itemId, title: itemTitle }));
    navigate(ROUTES.TALENT_MATCH);
    setDetailItem(null);
  };

  const handleViewDetails = useCallback(
    (item) => {
      let itemType = item.type;
      if (itemType === "projects") itemType = "project";
      else if (!itemType) {
        if (item.project_type || item.project_title) itemType = "project";
        else if (item.job_type || item.job_title) itemType = "job";
        else itemType = "job";
      }
      const itemId = item.id || item.job_id || item.project_id;
      if (!itemId) return;
      const itemWithType = {
        ...item,
        type: itemType,
        id: itemId,
        title: item.title || item.job_title || item.project_title || "Untitled",
      };
      navigate(ROUTES.TALENT_DETAILS, { state: { item: itemWithType, role: "company_admin" } });
    },
    [navigate]
  );

  const openProspectsModal = useCallback((item) => {
    const itemId = item.id || item.job_id || item.project_id;
    const itemTitle = item.title || item.job_title || item.project_title || "Item";
    setProspectsModal({
      open: true,
      jobId: item.job_id || (item.type === "job" ? itemId : null),
      projectId: item.project_id || (item.type === "project" || item.type === "projects" ? itemId : null),
      itemTitle,
    });
  }, []);

  const handleOpenPricePrediction = useCallback(
    async (item) => {
      let prefillSource = { ...item };
      const projectId = item?.project_id || (getItemType(item) === "project" ? item?.id : null);
      const hasCorePrefill = Boolean(
        item?.project_description || item?.description || item?.required_skills || item?.skills
      );

      if (projectId && !hasCorePrefill) {
        try {
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const profileResponse = await axios.get(`${API_BASE}/profile/${projectId}?type=project`, { headers });
          prefillSource = profileResponse.data?.data || profileResponse.data || prefillSource;
        } catch {
          /* keep item */
        }
      }

      navigate(ROUTES.PRICE_PREDICTION, {
        state: {
          prefill: {
            project_description:
              prefillSource.project_description ||
              prefillSource.description ||
              item.project_description ||
              item.description ||
              "",
            features:
              prefillSource.required_skills ||
              prefillSource.skills ||
              item.required_skills ||
              item.skills ||
              "",
            domain:
              prefillSource.domain || prefillSource.preferred_domain || item.domain || item.preferred_domain || "",
            title:
              prefillSource.title ||
              prefillSource.project_title ||
              item.title ||
              item.project_title ||
              "Project",
          },
        },
      });
    },
    [navigate, token]
  );

  const handleTableFindMatches = useCallback(
    (e, item) => {
      e.stopPropagation();
      let itemType = item.type;
      if (itemType === "projects") itemType = "project";
      else if (!itemType) {
        if (item.project_title) itemType = "project";
        else itemType = "job";
      }
      const itemId = item.id || item.job_id || item.project_id;
      const itemTitle = item.title || item.job_title || item.project_title || "Untitled";
      if (!itemType || itemId == null) return;
      localStorage.setItem("selectedPost", JSON.stringify({ type: itemType, id: itemId, title: itemTitle }));
      navigate(ROUTES.TALENT_MATCH);
    },
    [navigate]
  );

  const headerCellSx = {
    fontWeight: 700,
    fontSize: "0.8125rem",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    py: 1.75,
    borderBottom: "none",
    bgcolor: theme.palette.mode === "dark" ? theme.palette.grey[800] : theme.palette.primary.main,
    color: theme.palette.mode === "dark" ? theme.palette.common.white : theme.palette.primary.contrastText,
    boxShadow: theme.palette.mode === "dark" ? "none" : `inset 0 -2px 0 ${theme.palette.primary.dark}`,
  };

  const actionIconSx = useCallback(
    () => ({
      border: `1px solid ${theme.palette.divider}`,
      backgroundColor: theme.palette.background.paper,
      "&:hover": {
        backgroundColor: theme.palette.action.hover,
      },
    }),
    [theme]
  );

  if (!user) {
    return null;
  }

  if (!isCompanyAdmin) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  const renderTable = (list) => (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{
        borderRadius: 2,
        overflow: "auto",
        borderColor: theme.palette.divider,
      }}
    >
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={headerCellSx}>{t("companyPostings.colTitle")}</TableCell>
            <TableCell sx={headerCellSx}>{t("companyPostings.colDomain")}</TableCell>
            <TableCell align="right" sx={headerCellSx}>
              {t("companyPostings.colId")}
            </TableCell>
            <TableCell align="right" sx={{ ...headerCellSx, minWidth: 200 }}>
              {t("companyPostings.actions")}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {list.map((row) => (
            <TableRow
              key={`${row.type}-${row.id}`}
              hover
              sx={{
                cursor: "pointer",
                "&:nth-of-type(even)": { bgcolor: theme.palette.action.hover },
              }}
              onClick={() => setDetailItem(row)}
            >
              <TableCell sx={{ fontWeight: 600, color: "text.primary" }}>{row.title || "—"}</TableCell>
              <TableCell sx={{ color: "text.secondary" }}>{row.domain || "—"}</TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", color: "text.secondary" }}>
                {row.id}
              </TableCell>
              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                <Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
                  <Tooltip title={t("companyPostings.actionFindMatches")}>
                    <IconButton size="small" aria-label={t("companyPostings.actionFindMatches")} sx={actionIconSx()} onClick={(e) => handleTableFindMatches(e, row)}>
                      <ArrowForwardIcon sx={{ fontSize: 20, color: COLORS.success.main }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t("companyPostings.actionDetails")}>
                    <IconButton
                      size="small"
                      aria-label={t("companyPostings.actionDetails")}
                      sx={actionIconSx()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(row);
                      }}
                    >
                      <VisibilityIcon sx={{ fontSize: 20, color: COLORS.primary.main }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t("companyPostings.actionProspects")}>
                    <IconButton
                      size="small"
                      aria-label={t("companyPostings.actionProspects")}
                      sx={actionIconSx()}
                      onClick={(e) => {
                        e.stopPropagation();
                        openProspectsModal(row);
                      }}
                    >
                      <PeopleIcon sx={{ fontSize: 20, color: COLORS.accent.main }} />
                    </IconButton>
                  </Tooltip>
                  {getItemType(row) === "project" && (
                    <Tooltip title={t("companyPostings.actionPricePrediction")}>
                      <IconButton
                        size="small"
                        aria-label={t("companyPostings.actionPricePrediction")}
                        sx={actionIconSx()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPricePrediction(row);
                        }}
                      >
                        <QueryStatsIcon sx={{ fontSize: 20, color: COLORS.info.main }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderCards = () => (
    <Box sx={{ mt: 0.5 }}>
      <TopJobsProjects jobsProjects={currentList} isCompanyAdmin userRole="company_admin" />
    </Box>
  );

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t("companyPostings.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("companyPostings.subtitle")}
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ flexShrink: 0 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => navigate(ROUTES.COMPANY_POST_JOB)}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {t("companyPostings.newJob")}
          </Button>
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => navigate(ROUTES.COMPANY_POST_PROJECT)}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {t("companyPostings.newProject")}
          </Button>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderLeft: `4px solid ${COLORS.success.main}` }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            textColor="primary"
            indicatorColor="primary"
            sx={{ minHeight: 40 }}
          >
            <Tab label={`${t("companyPostings.jobsTab")} (${jobs.length})`} />
            <Tab label={`${t("companyPostings.projectsTab")} (${projects.length})`} />
          </Tabs>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={viewMode}
            onChange={(_, v) => v && setViewMode(v)}
            aria-label="view mode"
          >
            <ToggleButton value="table" aria-label="table">
              <ViewListIcon sx={{ mr: 0.5, fontSize: 18 }} />
              {t("companyPostings.viewTable")}
            </ToggleButton>
            <ToggleButton value="cards" aria-label="cards">
              <ViewModuleIcon sx={{ mr: 0.5, fontSize: 18 }} />
              {t("companyPostings.viewCards")}
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {loading ? (
          <Typography variant="body2">{t("common.loading")}</Typography>
        ) : currentList.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {tab === 0 ? t("companyPostings.emptyJobs") : t("companyPostings.emptyProjects")}
          </Typography>
        ) : viewMode === "table" ? (
          renderTable(currentList)
        ) : (
          renderCards()
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          {t("companyPostings.schemaHeading")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t("companyPostings.payloadHeading")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t("companyPostings.payloadBody")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          • {t("companyPostings.schemaJob")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • {t("companyPostings.schemaProject")}
        </Typography>
      </Paper>

      <Dialog open={Boolean(detailItem)} onClose={() => setDetailItem(null)} maxWidth="sm" fullWidth>
        {detailItem && (
          <>
            <DialogTitle sx={{ fontWeight: 700 }}>{t("companyPostings.detailTitle")}</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={1.5}>
                {orderDetailKeys(detailItem).map((key) => (
                  <Stack key={key} direction="row" spacing={1} alignItems="flex-start">
                    <Typography variant="caption" color="text.secondary" sx={{ width: 100, flexShrink: 0, textTransform: "capitalize" }}>
                      {key}
                    </Typography>
                    <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                      {detailItem[key] === null || detailItem[key] === undefined || detailItem[key] === ""
                        ? "—"
                        : String(detailItem[key])}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary" display="block">
                {t("companyPostings.payloadBody")}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setDetailItem(null)}>{t("companyPostings.close")}</Button>
              <Button variant="contained" onClick={() => openTalentMatch(detailItem)}>
                {t("companyPostings.openInTalentMatch")}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <ProspectsModal
        open={prospectsModal.open}
        onClose={() => setProspectsModal({ open: false, jobId: null, projectId: null, itemTitle: "" })}
        jobId={prospectsModal.jobId}
        projectId={prospectsModal.projectId}
        itemTitle={prospectsModal.itemTitle}
        token={token}
      />
    </Stack>
  );
};

export default CompanyPostingsPage;
