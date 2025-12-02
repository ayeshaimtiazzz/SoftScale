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
import TopCandidates from "./top-candidates";
import TopJobsProjects from "./top-jobs-projects";
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
import { useToast } from "../../providers/ToastProvider";
import { extractErrorMessage } from "../../utils/errorHandler";
import { COLORS } from "../../constants";
import PageTitle from "../../components/common/PageTitle";

const jobTypes = Object.values(JobType);
const workModes = Object.values(WorkMode);
const projectTypes = Object.values(ProjectType);
const paymentTypes = Object.values(PaymentType);

const CompanyDashboard = ({ currentUser, authToken }) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
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
        if (response.data.posts && response.data.posts.length > 0) {
          showToast(`Loaded ${response.data.posts.length} posts`, "success");
        }
      } catch (err) {
        const errorMsg = extractErrorMessage(err) || "Failed to load posts.";
        showToast(errorMsg, "error");
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
      showToast(t("forms.jobPostedSuccess"), "success");
    } catch (err) {
      const msg = err.response?.data?.detail || t("forms.postJobFailed");
      setError(msg);
      showToast(msg, "error");
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
      showToast(t("forms.projectPostedSuccess"), "success");
    } catch (err) {
      const msg = err.response?.data?.detail || t("forms.postProjectFailed");
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2}>
        <Button
          variant="contained"
          onClick={() => setShowJobForm((prev) => !prev)}
          sx={{
            background: `linear-gradient(135deg, ${COLORS.primary.gradientStart} 0%, ${COLORS.primary.gradientMid} 50%, ${COLORS.primary.gradientEnd} 100%)`,
            "&:hover": {
              background: `linear-gradient(135deg, ${COLORS.primary.dark} 0%, ${COLORS.primary.darker} 100%)`,
              boxShadow: `0 4px 12px ${COLORS.primary.darker}60`,
            },
          }}
        >
          {t("dashboard.postJob")}
        </Button>
        <Button
          variant="contained"
          onClick={() => setShowProjectForm((prev) => !prev)}
          sx={{
            background: `linear-gradient(135deg, ${COLORS.success.main} 0%, ${COLORS.success.dark} 100%)`,
            "&:hover": {
              background: `linear-gradient(135deg, ${COLORS.success.dark} 0%, ${COLORS.success.darker} 100%)`,
            },
          }}
        >
          {t("dashboard.postProject")}
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {successMessage && <Alert severity="success">{successMessage}</Alert>}

      {showJobForm && (
        <Card
          sx={{
            borderLeft: `4px solid ${COLORS.primary.main}`,
            backgroundColor: `${COLORS.primary.lightest}20`,
          }}
        >
          <CardContent>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: COLORS.primary.dark, fontWeight: 600 }}
            >
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
                  sx={{
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
          </CardContent>
        </Card>
      )}

      {showProjectForm && (
        <Card
          sx={{
            borderLeft: `4px solid ${COLORS.success.main}`,
            backgroundColor: `${COLORS.success.lightest}20`,
          }}
        >
          <CardContent>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: COLORS.success.dark, fontWeight: 600 }}
            >
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
                  sx={{
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
          </CardContent>
        </Card>
      )}

      <Card
        sx={{
          borderLeft: `4px solid ${COLORS.accent.main}`,
          backgroundColor: `${COLORS.accent.lightest}10`,
        }}
      >
        <CardContent>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ color: COLORS.accent.dark, fontWeight: 600 }}
          >
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
        sx={{
          alignSelf: "flex-start",
          background: `linear-gradient(135deg, ${COLORS.success.main} 0%, ${COLORS.success.dark} 100%)`,
          "&:hover": {
            background: `linear-gradient(135deg, ${COLORS.success.dark} 0%, ${COLORS.success.darker} 100%)`,
          },
        }}
      >
        {t("dashboard.findMatches")}
      </Button>
      <Card
        sx={{
          borderLeft: `4px solid ${COLORS.success.main}`,
          backgroundColor: `${COLORS.success.lightest}10`,
        }}
      >
        <CardContent>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ color: COLORS.success.dark, fontWeight: 600 }}
          >
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
    {
      label: t("dashboard.activeCandidates"),
      value: metrics.activeCandidates,
      color: COLORS.info, // Blue
      icon: "👥",
    },
    {
      label: t("dashboard.avgMatchScore"),
      value: `${metrics.avgMatchScore}%`,
      color: COLORS.success,
      icon: "📊",
    },
    {
      label: t("dashboard.revenueThisMonth"),
      value: `$${metrics.revenueThisMonth.toLocaleString()}`,
      color: COLORS.accent,
      icon: "💰",
    },
    {
      label: t("dashboard.activeDeals"),
      value: metrics.activeDeals,
      color: COLORS.secondary,
      icon: "🤝",
    },
  ];

  return (
    <Box>
      <PageTitle title={t("dashboard.title")} />
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {metricCards.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={metric.label}>
            <Card
              sx={{
                borderLeft: `4px solid ${metric.color.main}`,
                borderTop: `1px solid ${metric.color.light}`,
                borderRight: `1px solid ${metric.color.light}`,
                borderBottom: `1px solid ${metric.color.light}`,
                boxShadow: `0 4px 12px ${metric.color.lighter}30`,
                backgroundColor: `${metric.color.lightest}10`,
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: `0 8px 24px ${metric.color.light}50`,
                  borderLeft: `4px solid ${metric.color.dark}`,
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <Typography
                    variant="h4"
                    sx={{
                      fontSize: "2rem",
                      color: metric.color.main,
                      fontWeight: 700,
                    }}
                  >
                    {metric.icon}
                  </Typography>
                </Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: metric.color.dark,
                    fontWeight: 500,
                    mb: 1,
                    fontSize: "0.875rem",
                  }}
                >
                  {metric.label}
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    color: metric.color.dark,
                    fontWeight: 700,
                    fontSize: "1.75rem",
                  }}
                >
                  {metric.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {role === "company_admin" && <CompanyDashboard currentUser={user} authToken={token} />}

      {(role === "freelancer" || role === "jobseeker") && <FreelancerDashboard jobs={jobs} />}

      {role === "company_admin" && (
        <Box mt={4}>
          <TopCandidates />
        </Box>
      )}
    </Box>
  );
};

export default Dashboard;