/**
 * Shared job / project posting forms for company admins (workspace + optional reuse).
 */

import React, { useState } from "react";
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { Work as WorkIcon, Assignment as ProjectIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API_BASE } from "config";
import { DOMAINS, JobType, WorkMode, ProjectType, PaymentType, COLORS } from "../../constants";
import { useAuth } from "../../contexts/AuthContext";

const jobTypes = Object.values(JobType);
const workModes = Object.values(WorkMode);
const projectTypes = Object.values(ProjectType);
const paymentTypes = Object.values(PaymentType);

export const CompanyPostJobForm = ({ onSuccess, onCancel }) => {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [jobForm, setJobForm] = useState({
    job_title: "",
    job_description: "",
    job_type: "",
    required_experience: "",
    required_skills: "",
    work_mode: "",
    salary: "",
    preferred_domain: "",
  });

  const handleJobChange = (field, value) => {
    setJobForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleJobSubmit = async (e) => {
    e.preventDefault();
    if (!user?.user_id) {
      setError(t("forms.userNotFound"));
      return;
    }
    setLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      await axios.post(
        `${API_BASE}/post-job`,
        {
          user_id: user.user_id,
          ...jobForm,
          salary: jobForm.salary ? parseFloat(jobForm.salary) : null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setJobForm({
        job_title: "",
        job_description: "",
        job_type: "",
        required_experience: "",
        required_skills: "",
        work_mode: "",
        salary: "",
        preferred_domain: "",
      });
      setSuccessMessage(t("forms.jobPostedSuccess"));
      onSuccess?.();
    } catch (err) {
      const msg = err.response?.data?.detail || t("forms.postJobFailed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleJobSubmit} id="company-post-job-form">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage("")}>
          {successMessage}
        </Alert>
      )}
      <Stack spacing={3}>
        <Typography variant="body2" color="text.secondary">
          {t("companyWorkspace.jobFormIntro")}
        </Typography>
        <TextField
          label={t("forms.jobTitle")}
          value={jobForm.job_title}
          onChange={(e) => handleJobChange("job_title", e.target.value)}
          required
          fullWidth
          placeholder="e.g., Senior Software Engineer"
        />
        <TextField
          label={t("forms.jobDescription")}
          value={jobForm.job_description}
          onChange={(e) => handleJobChange("job_description", e.target.value)}
          required
          multiline
          minRows={4}
          fullWidth
          placeholder="Describe the role, responsibilities, and requirements..."
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label={t("forms.jobType")}
            value={jobForm.job_type}
            onChange={(e) => handleJobChange("job_type", e.target.value)}
            required
            fullWidth
          >
            {jobTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={t("forms.workMode")}
            value={jobForm.work_mode}
            onChange={(e) => handleJobChange("work_mode", e.target.value)}
            required
            fullWidth
          >
            {workModes.map((mode) => (
              <MenuItem key={mode} value={mode}>
                {mode}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label={t("forms.requiredExperience")}
            value={jobForm.required_experience}
            onChange={(e) => handleJobChange("required_experience", e.target.value)}
            fullWidth
            placeholder="e.g., 3-5 years"
          />
          <TextField
            type="number"
            label={t("forms.salary")}
            value={jobForm.salary}
            onChange={(e) => handleJobChange("salary", e.target.value)}
            fullWidth
            placeholder="e.g., 50000"
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
            }}
          />
        </Stack>
        <TextField
          label={t("forms.skillsPlaceholder")}
          value={jobForm.required_skills}
          onChange={(e) => handleJobChange("required_skills", e.target.value)}
          fullWidth
          placeholder="e.g., JavaScript, React, Node.js (comma-separated)"
        />
        <TextField
          select
          label={t("forms.preferredDomain")}
          value={jobForm.preferred_domain}
          onChange={(e) => handleJobChange("preferred_domain", e.target.value)}
          required
          fullWidth
        >
          {DOMAINS.map((domain) => (
            <MenuItem key={domain} value={domain}>
              {domain}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
        {onCancel && (
          <Button variant="outlined" onClick={onCancel} disabled={loading} sx={{ textTransform: "none" }}>
            {t("common.cancel")}
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          startIcon={<WorkIcon />}
          sx={{
            textTransform: "none",
            background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.dark} 100%)`,
            "&:hover": {
              background: `linear-gradient(135deg, ${COLORS.primary.dark} 0%, ${COLORS.primary.darker} 100%)`,
            },
          }}
        >
          {loading ? t("forms.posting") : t("forms.createJob")}
        </Button>
      </Stack>
    </Box>
  );
};

export const CompanyPostProjectForm = ({ onSuccess, onCancel }) => {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [projectForm, setProjectForm] = useState({
    project_title: "",
    project_description: "",
    project_type: "",
    payment_type: "",
    work_mode: "",
    required_experience: "",
    required_skills: "",
    team_size: "",
    duration: "",
    domain: "",
    salary: "",
  });

  const handleProjectChange = (field, value) => {
    setProjectForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProjectSubmit = async (e) => {
    e.preventDefault();
    if (!user?.user_id) {
      setError(t("forms.userNotFound"));
      return;
    }
    setLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      await axios.post(
        `${API_BASE}/post-project`,
        {
          user_id: user.user_id,
          ...projectForm,
          team_size: projectForm.team_size ? parseInt(projectForm.team_size, 10) : null,
          salary: projectForm.salary ? parseInt(projectForm.salary, 10) : null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProjectForm({
        project_title: "",
        project_description: "",
        project_type: "",
        payment_type: "",
        work_mode: "",
        required_experience: "",
        required_skills: "",
        team_size: "",
        duration: "",
        domain: "",
        salary: "",
      });
      setSuccessMessage(t("forms.projectPostedSuccess"));
      onSuccess?.();
    } catch (err) {
      const msg = err.response?.data?.detail || t("forms.postProjectFailed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleProjectSubmit} id="company-post-project-form">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage("")}>
          {successMessage}
        </Alert>
      )}
      <Stack spacing={3}>
        <Typography variant="body2" color="text.secondary">
          {t("companyWorkspace.projectFormIntro")}
        </Typography>
        <TextField
          label={t("forms.projectTitle")}
          value={projectForm.project_title}
          onChange={(e) => handleProjectChange("project_title", e.target.value)}
          required
          fullWidth
          placeholder="e.g., E-commerce Website Development"
        />
        <TextField
          label={t("forms.projectDescription")}
          value={projectForm.project_description}
          onChange={(e) => handleProjectChange("project_description", e.target.value)}
          required
          multiline
          minRows={4}
          fullWidth
          placeholder="Describe the project scope, objectives, and deliverables..."
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label={t("forms.projectType")}
            value={projectForm.project_type}
            onChange={(e) => handleProjectChange("project_type", e.target.value)}
            required
            fullWidth
          >
            {projectTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={t("forms.paymentType")}
            value={projectForm.payment_type}
            onChange={(e) => handleProjectChange("payment_type", e.target.value)}
            required
            fullWidth
          >
            {paymentTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label={t("forms.workMode")}
            value={projectForm.work_mode}
            onChange={(e) => handleProjectChange("work_mode", e.target.value)}
            required
            fullWidth
          >
            {workModes.map((mode) => (
              <MenuItem key={mode} value={mode}>
                {mode}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={t("forms.domain")}
            value={projectForm.domain}
            onChange={(e) => handleProjectChange("domain", e.target.value)}
            required
            fullWidth
          >
            {DOMAINS.map((domain) => (
              <MenuItem key={domain} value={domain}>
                {domain}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label={t("forms.requiredExperience")}
            value={projectForm.required_experience}
            onChange={(e) => handleProjectChange("required_experience", e.target.value)}
            fullWidth
            placeholder="e.g., 2-3 years"
          />
          <TextField
            type="number"
            label={t("forms.teamSize")}
            value={projectForm.team_size}
            onChange={(e) => handleProjectChange("team_size", e.target.value)}
            fullWidth
            placeholder="e.g., 3"
          />
          <TextField
            label={t("forms.duration")}
            value={projectForm.duration}
            onChange={(e) => handleProjectChange("duration", e.target.value)}
            fullWidth
            placeholder="e.g., 3 months"
          />
        </Stack>
        <TextField
          label={t("forms.skillsPlaceholder")}
          value={projectForm.required_skills}
          onChange={(e) => handleProjectChange("required_skills", e.target.value)}
          fullWidth
          placeholder="e.g., React, Python, AWS (comma-separated)"
        />
        <TextField
          type="number"
          label={t("forms.budget")}
          value={projectForm.salary}
          onChange={(e) => handleProjectChange("salary", e.target.value)}
          fullWidth
          placeholder="e.g., 10000"
          InputProps={{
            startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
          }}
        />
      </Stack>
      <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
        {onCancel && (
          <Button variant="outlined" onClick={onCancel} disabled={loading} sx={{ textTransform: "none" }}>
            {t("common.cancel")}
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          startIcon={<ProjectIcon />}
          sx={{
            textTransform: "none",
            background: `linear-gradient(135deg, ${COLORS.success.main} 0%, ${COLORS.success.dark} 100%)`,
            "&:hover": {
              background: `linear-gradient(135deg, ${COLORS.success.dark} 0%, ${COLORS.success.darker} 100%)`,
            },
          }}
        >
          {loading ? t("forms.posting") : t("forms.createProject")}
        </Button>
      </Stack>
    </Box>
  );
};
