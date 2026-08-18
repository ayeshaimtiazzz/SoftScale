/**
 * Edit company profile — same fields as signup CompanyForm (MUI).
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { API_BASE } from "config";
import { DOMAINS, API_ENDPOINTS, COLORS } from "../../constants";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../providers/ToastProvider";
import { extractErrorMessage } from "../../utils/errorHandler";

const emptyForm = {
  company_name: "",
  company_description: "",
  domain: "",
  country: "",
  city: "",
  company_size: "",
};

const CompanyProfileEditDialog = ({ open, onClose, onSaved }) => {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !token || !user?.user_id) return;

    const load = async () => {
      setLoadingData(true);
      setError("");
      try {
        const idRes = await axios.get(`${API_BASE}/get-profile-id`, {
          params: { role: "company" },
          headers: { Authorization: `Bearer ${token}` },
        });
        const profileId = idRes.data?.profile_id;
        if (!profileId) {
          setError(t("companyWorkspace.editNoProfile"));
          setFormData(emptyForm);
          return;
        }
        const profRes = await axios.get(`${API_BASE}/profile/${profileId}`, {
          params: { type: "company" },
        });
        const raw = profRes.data?.data || profRes.data || {};
        setFormData({
          company_name: raw.company_name || "",
          company_description: raw.company_description || "",
          domain: raw.domain || "",
          country: raw.country || "",
          city: raw.city || "",
          company_size: raw.company_size || "",
        });
      } catch (e) {
        setError(extractErrorMessage(e) || t("companyWorkspace.editLoadFailed"));
        setFormData(emptyForm);
      } finally {
        setLoadingData(false);
      }
    };

    load();
  }, [open, token, user?.user_id, t]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const domainOptions = useMemo(() => {
    const set = new Set(DOMAINS);
    if (formData.domain && !set.has(formData.domain)) {
      return [...DOMAINS, formData.domain];
    }
    return DOMAINS;
  }, [formData.domain]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      await axios.put(
        `${API_BASE}${API_ENDPOINTS.UPDATE_COMPANY_PROFILE}`,
        {
          company_name: formData.company_name.trim(),
          company_description: formData.company_description.trim(),
          domain: formData.domain,
          country: formData.country?.trim() || null,
          city: formData.city?.trim() || null,
          company_size: formData.company_size?.trim() || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(t("companyWorkspace.editSaveSuccess"), "success");
      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(extractErrorMessage(err) || t("companyWorkspace.editSaveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700 }}>{t("companyWorkspace.editDialogTitle")}</DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}
          {loadingData ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                name="company_name"
                label={t("companyWorkspace.fieldCompanyName")}
                value={formData.company_name}
                onChange={handleChange}
                required
                fullWidth
              />
              <TextField
                name="company_description"
                label={t("companyWorkspace.fieldCompanyDescription")}
                value={formData.company_description}
                onChange={handleChange}
                required
                multiline
                minRows={4}
                fullWidth
              />
              <TextField
                name="domain"
                label={t("companyWorkspace.fieldDomain")}
                value={formData.domain}
                onChange={handleChange}
                required
                select
                fullWidth
              >
                {domainOptions.map((d) => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </TextField>
              <TextField name="country" label={t("companyWorkspace.fieldCountry")} value={formData.country} onChange={handleChange} fullWidth />
              <TextField name="city" label={t("companyWorkspace.fieldCity")} value={formData.city} onChange={handleChange} fullWidth />
              <TextField
                name="company_size"
                label={t("companyWorkspace.fieldCompanySize")}
                value={formData.company_size}
                onChange={handleChange}
                fullWidth
                placeholder={t("companyWorkspace.fieldCompanySizePlaceholder")}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={loading} sx={{ textTransform: "none" }}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || loadingData}
            sx={{
              textTransform: "none",
              background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.dark} 100%)`,
            }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : t("companyWorkspace.editSave")}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default CompanyProfileEditDialog;
