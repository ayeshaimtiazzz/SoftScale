import React, { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
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
  Typography,
  Paper,
} from "@mui/material";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { API_BASE } from "config";
import { ROUTES, UserRole, COLORS } from "../../constants";
import { useAuth } from "../../contexts/AuthContext";

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

const orderDetailKeys = (obj) => {
  const preferred = ["type", "id", "title", "domain"];
  const keys = Object.keys(obj || {});
  const rest = keys.filter((k) => !preferred.includes(k)).sort();
  return [...preferred.filter((k) => keys.includes(k)), ...rest];
};

const CompanyPostingsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [viewMode, setViewMode] = useState("table");
  const [detailItem, setDetailItem] = useState(null);
  const fetchRef = useRef(false);

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

  if (!user) {
    return null;
  }

  if (!isCompanyAdmin) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  const renderTable = (list) => (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>{t("companyPostings.colTitle")}</TableCell>
            <TableCell>{t("companyPostings.colDomain")}</TableCell>
            <TableCell align="right">{t("companyPostings.colId")}</TableCell>
            <TableCell align="right">{t("companyPostings.actions")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {list.map((row) => (
            <TableRow key={`${row.type}-${row.id}`} hover sx={{ cursor: "pointer" }} onClick={() => setDetailItem(row)}>
              <TableCell sx={{ fontWeight: 600 }}>{row.title || "—"}</TableCell>
              <TableCell>{row.domain || "—"}</TableCell>
              <TableCell align="right">{row.id}</TableCell>
              <TableCell align="right">
                <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); setDetailItem(row); }}>
                  {t("companyPostings.viewDetails")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderCards = (list) => (
    <Grid container spacing={2}>
      {list.map((row) => {
        const isJob = isJobRow(row);
        return (
          <Grid item xs={12} sm={6} md={4} key={`${row.type}-${row.id}`}>
            <Card
              variant="outlined"
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                borderLeft: `4px solid ${isJob ? COLORS.info.main : COLORS.success.main}`,
                borderRadius: 2,
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 1 }}>
                  {isJob ? (
                    <WorkOutlineIcon sx={{ color: COLORS.info.main, mt: 0.25 }} />
                  ) : (
                    <AssignmentOutlinedIcon sx={{ color: COLORS.success.main, mt: 0.25 }} />
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                      {row.title || "—"}
                    </Typography>
                    <Chip size="small" label={isJob ? t("companyPostings.jobsTab") : t("companyPostings.projectsTab")} sx={{ mt: 1 }} />
                  </Box>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {t("companyPostings.colDomain")}: {row.domain || "—"}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  ID: {row.id}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: "flex-end", pt: 0, px: 2, pb: 2 }}>
                <Button size="small" onClick={() => setDetailItem(row)}>
                  {t("companyPostings.viewDetails")}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          {t("companyPostings.title")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("companyPostings.subtitle")}
        </Typography>
      </Box>

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
          renderCards(currentList)
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
    </Stack>
  );
};

export default CompanyPostingsPage;
