import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Person as PersonIcon } from "@mui/icons-material";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { API_BASE } from "config";
import { COLORS } from "../../../constants";

const CatalogProspects = () => {
  const { t } = useTranslation();
  const { itemType, itemId, title, token } = useOutletContext();
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const jobId = itemType === "job" ? itemId : null;
  const projectId = itemType === "project" ? itemId : null;

  useEffect(() => {
    if (!token || itemId == null) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoint = jobId ? `${API_BASE}/jobs/${jobId}/prospects` : `${API_BASE}/projects/${projectId}/prospects`;
        const response = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          if (response.data.success) setProspects(response.data.prospects || []);
          else setError(t("companyWorkspace.catalogProspectsLoadFailed"));
        }
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.detail || e.message || "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [token, itemId, jobId, projectId, t]);

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" sx={{ py: 2 }}>
        {error}
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {t("companyWorkspace.catalogProspectsFor", { title: title || `#${itemId}` })}
      </Typography>
      {prospects.length === 0 ? (
        <Typography color="text.secondary">{t("companyWorkspace.catalogProspectsEmpty")}</Typography>
      ) : (
        prospects.map((prospect, index) => (
          <Paper key={prospect.prospect_id || index} sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: COLORS.primary.main }}>
                {prospect.talent_name ? getInitials(prospect.talent_name) : <PersonIcon />}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {prospect.talent_name || "—"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {prospect.talent_type || "Talent"}
                  {prospect.talent_id && ` • ID: ${prospect.talent_id}`}
                </Typography>
                {prospect.created_at && (
                  <Typography variant="caption" color="text.secondary">
                    {new Date(prospect.created_at).toLocaleString()}
                  </Typography>
                )}
              </Box>
              {prospect.match_score != null && (
                <Chip
                  label={`${prospect.match_score}%`}
                  size="small"
                  sx={{
                    backgroundColor: `${COLORS.success.main}20`,
                    color: COLORS.success.dark,
                  }}
                />
              )}
            </Stack>
          </Paper>
        ))
      )}
    </Stack>
  );
};

export default CatalogProspects;
