import React, { useMemo, useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TopCandidates from "../../components/TopCandidates";
import TopJobsProjects from "../../components/TopJobsProjects";
import "./styles.css";
import { API_BASE } from "config";
import {
  DOMAINS,
  JobType,
  WorkMode,
  ProjectType,
  PaymentType,
  STORAGE_KEYS,
  ROUTES,
} from "../../constants";
import { readJson } from "../../utils/storage";
import { useAuth } from "../../contexts/AuthContext";

const jobTypes = Object.values(JobType);
const workModes = Object.values(WorkMode);
const projectTypes = Object.values(ProjectType);
const paymentTypes = Object.values(PaymentType);

const CompanyDashboard = ({ currentUser, authToken }) => {
  const { t } = useTranslation();
  const [showJobForm, setShowJobForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [companyPosts, setCompanyPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
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

  useEffect(() => {
    const fetchCompanyPosts = async () => {
      if (!currentUser?.user_id || !authToken) {
        setLoadingPosts(false);
        return;
      }
      try {
        const response = await axios.get(`${API_BASE}/get-company-posts`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        setCompanyPosts(response.data.posts || []);
      } catch (err) {
        console.error("Failed to fetch company posts:", err);
      } finally {
        setLoadingPosts(false);
      }
    };
    fetchCompanyPosts();
  }, [currentUser, authToken]);

  const handleJobChange = (field, value) => {
    setJobForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProjectChange = (field, value) => {
    setProjectForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleJobSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?.user_id) {
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
          user_id: currentUser.user_id,
          ...jobForm,
          salary: jobForm.salary ? parseFloat(jobForm.salary) : null,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      setShowJobForm(false);
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
    } catch (err) {
      const msg = err.response?.data?.detail || t("forms.postJobFailed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?.user_id) {
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
          user_id: currentUser.user_id,
          ...projectForm,
          team_size: projectForm.team_size
            ? parseInt(projectForm.team_size, 10)
            : null,
          salary: projectForm.salary ? parseInt(projectForm.salary, 10) : null,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      setShowProjectForm(false);
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
    } catch (err) {
      const msg = err.response?.data?.detail || t("forms.postProjectFailed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2}>
        <Button variant="contained" onClick={() => setShowJobForm((prev) => !prev)}>
          {t("dashboard.postJob")}
        </Button>
        <Button
          variant="outlined"
          onClick={() => setShowProjectForm((prev) => !prev)}
        >
          {t("dashboard.postProject")}
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {successMessage && <Alert severity="success">{successMessage}</Alert>}

      {showJobForm && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t("forms.createJob")}
            </Typography>
            <Box component="form" onSubmit={handleJobSubmit}>
              <Stack spacing={2}>
                <TextField
                  label={t("forms.jobTitle")}
                  value={jobForm.job_title}
                  onChange={(e) => handleJobChange("job_title", e.target.value)}
                  required
                />
                <TextField
                  label={t("forms.jobDescription")}
                  value={jobForm.job_description}
                  onChange={(e) =>
                    handleJobChange("job_description", e.target.value)
                  }
                  required
                  multiline
                  minRows={3}
                />
                <TextField
                  select
                  label={t("forms.jobType")}
                  value={jobForm.job_type}
                  onChange={(e) => handleJobChange("job_type", e.target.value)}
                  required
                >
                  {jobTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label={t("forms.requiredExperience")}
                  value={jobForm.required_experience}
                  onChange={(e) =>
                    handleJobChange("required_experience", e.target.value)
                  }
                />
                <TextField
                  label={t("forms.skillsPlaceholder")}
                  value={jobForm.required_skills}
                  onChange={(e) =>
                    handleJobChange("required_skills", e.target.value)
                  }
                />
                <TextField
                  select
                  label={t("forms.workMode")}
                  value={jobForm.work_mode}
                  onChange={(e) => handleJobChange("work_mode", e.target.value)}
                  required
                >
                  {workModes.map((mode) => (
                    <MenuItem key={mode} value={mode}>
                      {mode}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  type="number"
                  label={t("forms.salary")}
                  value={jobForm.salary}
                  onChange={(e) => handleJobChange("salary", e.target.value)}
                />
                <TextField
                  select
                  label={t("forms.preferredDomain")}
                  value={jobForm.preferred_domain}
                  onChange={(e) =>
                    handleJobChange("preferred_domain", e.target.value)
                  }
                  required
                >
                  {DOMAINS.map((domain) => (
                    <MenuItem key={domain} value={domain}>
                      {domain}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                >
                  {loading ? t("forms.posting") : t("forms.createJob")}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      )}

      {showProjectForm && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t("forms.createProject")}
            </Typography>
            <Box component="form" onSubmit={handleProjectSubmit}>
              <Stack spacing={2}>
                <TextField
                  label={t("forms.projectTitle")}
                  value={projectForm.project_title}
                  onChange={(e) =>
                    handleProjectChange("project_title", e.target.value)
                  }
                  required
                />
                <TextField
                  label={t("forms.projectDescription")}
                  value={projectForm.project_description}
                  onChange={(e) =>
                    handleProjectChange("project_description", e.target.value)
                  }
                  required
                  multiline
                  minRows={3}
                />
                <TextField
                  select
                  label={t("forms.projectType")}
                  value={projectForm.project_type}
                  onChange={(e) =>
                    handleProjectChange("project_type", e.target.value)
                  }
                  required
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
                  onChange={(e) =>
                    handleProjectChange("payment_type", e.target.value)
                  }
                  required
                >
                  {paymentTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label={t("forms.workMode")}
                  value={projectForm.work_mode}
                  onChange={(e) =>
                    handleProjectChange("work_mode", e.target.value)
                  }
                  required
                >
                  {workModes.map((mode) => (
                    <MenuItem key={mode} value={mode}>
                      {mode}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label={t("forms.requiredExperience")}
                  value={projectForm.required_experience}
                  onChange={(e) =>
                    handleProjectChange("required_experience", e.target.value)
                  }
                />
                <TextField
                  label={t("forms.skillsPlaceholder")}
                  value={projectForm.required_skills}
                  onChange={(e) =>
                    handleProjectChange("required_skills", e.target.value)
                  }
                />
                <TextField
                  type="number"
                  label={t("forms.teamSize")}
                  value={projectForm.team_size}
                  onChange={(e) =>
                    handleProjectChange("team_size", e.target.value)
                  }
                />
                <TextField
                  label={t("forms.duration")}
                  value={projectForm.duration}
                  onChange={(e) =>
                    handleProjectChange("duration", e.target.value)
                  }
                />
                <TextField
                  select
                  label={t("forms.domain")}
                  value={projectForm.domain}
                  onChange={(e) =>
                    handleProjectChange("domain", e.target.value)
                  }
                  required
                >
                  {DOMAINS.map((domain) => (
                    <MenuItem key={domain} value={domain}>
                      {domain}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  type="number"
                  label={t("forms.budget")}
                  value={projectForm.salary}
                  onChange={(e) =>
                    handleProjectChange("salary", e.target.value)
                  }
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                >
                  {loading ? t("forms.posting") : t("forms.createProject")}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t("dashboard.topJobsProjects")}
          </Typography>
          {loadingPosts ? (
            <Typography variant="body2">{t("common.loading")}</Typography>
          ) : (
            <TopJobsProjects jobsProjects={companyPosts} isCompanyAdmin />
          )}
        </CardContent>
      </Card>
    </Stack>
  );
};

const FreelancerDashboard = ({ jobs }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const randomTopJobs = useMemo(() => {
    if (!jobs?.length) {
      return [];
    }
    const shuffled = [...jobs].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  }, [jobs]);

  return (
    <Stack spacing={3}>
      <Button
        variant="contained"
        onClick={() => navigate(ROUTES.TALENT_MATCH)}
        sx={{ alignSelf: "flex-start" }}
      >
        {t("dashboard.findMatches")}
      </Button>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t("dashboard.topJobsProjects")}
          </Typography>
          <TopJobsProjects jobsProjects={randomTopJobs} />
        </CardContent>
      </Card>
    </Stack>
  );
};

const Dashboard = () => {
  const { user, token } = useAuth();
  const { t } = useTranslation();

  const jobs = readJson(STORAGE_KEYS.JOBS, []);
  const freelancerProfiles = readJson(STORAGE_KEYS.FREELANCER_PROFILES, []);
  const jobSeekerProfiles = readJson(STORAGE_KEYS.JOB_SEEKER_PROFILES, []);

  const metrics = {
    activeCandidates: freelancerProfiles.length + jobSeekerProfiles.length || 0,
    avgMatchScore: 87,
    revenueThisMonth: Number(localStorage.getItem("revenueThisMonth")) || 124500,
    activeDeals: Number(localStorage.getItem("activeDeals")) || 47,
  };

  const role = user?.role || "guest";

  const metricCards = [
    { label: t("dashboard.activeCandidates"), value: metrics.activeCandidates },
    { label: t("dashboard.avgMatchScore"), value: `${metrics.avgMatchScore}%` },
    {
      label: t("dashboard.revenueThisMonth"),
      value: `$${metrics.revenueThisMonth.toLocaleString()}`,
    },
    { label: t("dashboard.activeDeals"), value: metrics.activeDeals },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t("dashboard.title")}
      </Typography>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {metricCards.map((metric) => (
          <Grid item xs={12} sm={6} md={3} key={metric.label}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  {metric.label}
                </Typography>
                <Typography variant="h5" fontWeight={600}>
                  {metric.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {role === "company_admin" && (
        <CompanyDashboard currentUser={user} authToken={token} />
      )}

      {(role === "freelancer" || role === "jobseeker") && (
        <FreelancerDashboard jobs={jobs} />
      )}

      {role === "company_admin" && (
        <Box mt={4}>
          <TopCandidates />
        </Box>
      )}
    </Box>
  );
};

export default Dashboard;