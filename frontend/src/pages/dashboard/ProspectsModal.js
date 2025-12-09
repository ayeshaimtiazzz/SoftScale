import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Paper,
  Avatar,
  CircularProgress,
  Chip,
} from "@mui/material";
import { Close as CloseIcon, Person as PersonIcon } from "@mui/icons-material";
import { COLORS } from "../../constants";
import axios from "axios";
import { API_BASE } from "../../config";

const ProspectsModal = ({ open, onClose, jobId, projectId, itemTitle, token }) => {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && token) {
      fetchProspects();
    } else {
      setProspects([]);
      setError(null);
    }
  }, [open, jobId, projectId, token]);

  const fetchProspects = async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = "";
      if (jobId) {
        endpoint = `${API_BASE}/jobs/${jobId}/prospects`;
      } else if (projectId) {
        endpoint = `${API_BASE}/projects/${projectId}/prospects`;
      } else {
        setError("Invalid job or project ID");
        return;
      }

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setProspects(response.data.prospects || []);
      } else {
        setError("Failed to load prospects");
      }
    } catch (err) {
      console.error("Failed to fetch prospects:", err);
      setError(err.response?.data?.detail || "Failed to load prospects");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Prospects for {itemTitle || "Item"}
          </Typography>
          <Button onClick={onClose} size="small" sx={{ minWidth: "auto" }}>
            <CloseIcon />
          </Button>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : prospects.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography color="text.secondary">No prospects yet for this {jobId ? "job" : "project"}.</Typography>
          </Box>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            {prospects.map((prospect, index) => (
              <Paper key={prospect.prospect_id || index} sx={{ p: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: COLORS.primary.main }}>
                    {prospect.talent_name ? getInitials(prospect.talent_name) : <PersonIcon />}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {prospect.talent_name || "Unknown Talent"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {prospect.talent_type || "Talent"}
                      {prospect.talent_id && ` • ID: ${prospect.talent_id}`}
                    </Typography>
                    {prospect.created_at && (
                      <Typography variant="caption" color="text.secondary">
                        Selected on: {new Date(prospect.created_at).toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>
                  {prospect.match_score && (
                    <Chip
                      label={`${prospect.match_score}% Match`}
                      size="small"
                      sx={{
                        backgroundColor: `${COLORS.success.main}20`,
                        color: COLORS.success.dark,
                      }}
                    />
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProspectsModal;

