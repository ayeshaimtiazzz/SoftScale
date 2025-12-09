import React, { useMemo, useState, useEffect, useRef, lazy, Suspense } from "react";
import { Alert, Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography, Dialog, DialogTitle, DialogContent, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import TopCandidates from "./top-candidates";
import TopJobsProjects from "./top-jobs-projects";
import MetricCards from "./metric-cards";
import "./styles.css";
import { API_BASE } from "config";
import { DOMAINS, JobType, WorkMode, ProjectType, PaymentType, ROUTES } from "../../constants";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../providers/ToastProvider";
import { extractErrorMessage } from "../../utils/errorHandler";
import { COLORS } from "../../constants";

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
  const [availableProjects, setAvailableProjects] = useState([]);
  const [loadingAvailableProjects, setLoadingAvailableProjects] = useState(true);
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

  // Use refs to track if requests are already in progress
  const companyPostsFetchRef = useRef(false);
  const availableProjectsFetchRef = useRef(false);

  useEffect(() => {
    // Skip if already fetching
    if (companyPostsFetchRef.current) {
      return;
    }

    if (!currentUser?.user_id || !authToken) {
      setLoadingPosts(false);
      return;
    }

    companyPostsFetchRef.current = true;
    setLoadingPosts(true);

    const fetchCompanyPosts = async () => {
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
        companyPostsFetchRef.current = false;
      }
    };
    fetchCompanyPosts();
  }, [currentUser?.user_id, authToken, showToast]);

  useEffect(() => {
    // Skip if already fetching
    if (availableProjectsFetchRef.current) {
      return;
    }

    if (!currentUser?.user_id || !authToken) {
      setLoadingAvailableProjects(false);
      return;
    }

    availableProjectsFetchRef.current = true;
    setLoadingAvailableProjects(true);

    const fetchAvailableProjects = async () => {
      try {
        const response = await axios.get(`${API_BASE}/available-projects-for-deals`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        setAvailableProjects(response.data || []);
      } catch (err) {
        console.error("Failed to fetch available projects:", err);
        // Don't show toast for this as it's optional
      } finally {
        setLoadingAvailableProjects(false);
        availableProjectsFetchRef.current = false;
      }
    };
    fetchAvailableProjects();
  }, [currentUser?.user_id, authToken]);

  const handleJobChange = (field, value) => {
    setJobForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProjectChange = (field, value) => {
    setProjectForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePursueAsDeal = async (projectId) => {
    if (!currentUser?.user_id || !authToken) {
      showToast("Please log in to pursue projects as deals", "error");
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${API_BASE}/deals/from-project/${projectId}`,
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      showToast("Deal created successfully! You can view it in your CRM.", "success");
      // Optionally navigate to CRM
      // navigate(ROUTES.CRM);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to create deal from project";
      showToast(msg, "error");
      console.error("Failed to create deal from project:", err);
    } finally {
      setLoading(false);
    }
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
          team_size: projectForm.team_size ? parseInt(projectForm.team_size, 10) : null,
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
            <Typography variant="h6" gutterBottom sx={{ color: COLORS.primary.dark, fontWeight: 600 }}>
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
                  onChange={(e) => handleJobChange("job_description", e.target.value)}
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
                  onChange={(e) => handleJobChange("required_experience", e.target.value)}
                />
                <TextField
                  label={t("forms.skillsPlaceholder")}
                  value={jobForm.required_skills}
                  onChange={(e) => handleJobChange("required_skills", e.target.value)}
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
                  onChange={(e) => handleJobChange("preferred_domain", e.target.value)}
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
            <Typography variant="h6" gutterBottom sx={{ color: COLORS.success.dark, fontWeight: 600 }}>
              {t("forms.createProject")}
            </Typography>
            <Box component="form" onSubmit={handleProjectSubmit}>
              <Stack spacing={2}>
                <TextField
                  label={t("forms.projectTitle")}
                  value={projectForm.project_title}
                  onChange={(e) => handleProjectChange("project_title", e.target.value)}
                  required
                />
                <TextField
                  label={t("forms.projectDescription")}
                  value={projectForm.project_description}
                  onChange={(e) => handleProjectChange("project_description", e.target.value)}
                  required
                  multiline
                  minRows={3}
                />
                <TextField
                  select
                  label={t("forms.projectType")}
                  value={projectForm.project_type}
                  onChange={(e) => handleProjectChange("project_type", e.target.value)}
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
                  onChange={(e) => handleProjectChange("payment_type", e.target.value)}
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
                  onChange={(e) => handleProjectChange("work_mode", e.target.value)}
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
                  onChange={(e) => handleProjectChange("required_experience", e.target.value)}
                />
                <TextField
                  label={t("forms.skillsPlaceholder")}
                  value={projectForm.required_skills}
                  onChange={(e) => handleProjectChange("required_skills", e.target.value)}
                />
                <TextField
                  type="number"
                  label={t("forms.teamSize")}
                  value={projectForm.team_size}
                  onChange={(e) => handleProjectChange("team_size", e.target.value)}
                />
                <TextField
                  label={t("forms.duration")}
                  value={projectForm.duration}
                  onChange={(e) => handleProjectChange("duration", e.target.value)}
                />
                <TextField
                  select
                  label={t("forms.domain")}
                  value={projectForm.domain}
                  onChange={(e) => handleProjectChange("domain", e.target.value)}
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
                  onChange={(e) => handleProjectChange("salary", e.target.value)}
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
          <Typography variant="h6" gutterBottom sx={{ color: COLORS.accent.dark, fontWeight: 600 }}>
            {t("dashboard.topJobsProjects")}
          </Typography>
          {loadingPosts ? (
            <Typography variant="body2">{t("common.loading")}</Typography>
          ) : (
            <TopJobsProjects jobsProjects={companyPosts} isCompanyAdmin />
          )}
        </CardContent>
      </Card>

      <Card
        sx={{
          borderLeft: `4px solid ${COLORS.success.main}`,
          backgroundColor: `${COLORS.success.lightest}10`,
        }}
      >
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ color: COLORS.success.dark, fontWeight: 600 }}>
            Available Projects to Pursue as Deals
          </Typography>
          {loadingAvailableProjects ? (
            <Typography variant="body2">{t("common.loading")}</Typography>
          ) : availableProjects.length > 0 ? (
            <TopJobsProjects
              jobsProjects={availableProjects}
              isCompanyAdmin
              showPursueAsDeal
              onPursueAsDeal={(projectId) => {
                // Handle pursue as deal
                handlePursueAsDeal(projectId);
              }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              No available projects to pursue at the moment.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
};

const FreelancerDashboard = ({ jobs, projects, loading }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Combine jobs and projects for display
  const allPosts = useMemo(() => {
    const combined = [
      ...(jobs || []).map((job) => ({ ...job, title: job.title || job.job_title })),
      ...(projects || []).map((proj) => ({ ...proj, title: proj.title || proj.project_title })),
    ];
    const shuffled = [...combined].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  }, [jobs, projects]);

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
          <Typography variant="h6" gutterBottom sx={{ color: COLORS.success.dark, fontWeight: 600 }}>
            {t("dashboard.topJobsProjects")}
          </Typography>
          {loading ? <Typography variant="body2">{t("common.loading")}</Typography> : <TopJobsProjects jobsProjects={allPosts} />}
        </CardContent>
      </Card>
    </Stack>
  );
};

const Dashboard = () => {
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Normalize role name - use useMemo to prevent unnecessary recalculations
  const role = useMemo(() => {
    let normalizedRole = user?.role || "guest";
    if (normalizedRole === "jobseeker") normalizedRole = "job_seeker";
    return normalizedRole;
  }, [user?.role]);

  // Use refs to track if requests are already in progress
  const metricsFetchRef = useRef(false);

  // Fetch dashboard metrics from backend
  useEffect(() => {
    // Skip if already fetching
    if (metricsFetchRef.current) {
      return;
    }

    if (!user?.user_id || !token || role === "guest") {
      setLoadingMetrics(false);
      setMetrics(null);
      return;
    }

    metricsFetchRef.current = true;
    setLoadingMetrics(true);

    const fetchMetrics = async () => {
      try {
        // eslint-disable-next-line no-console
        console.log("Fetching dashboard metrics for role:", role, "user_id:", user.user_id);
        const response = await axios.get(`${API_BASE}/dashboard-metrics`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { role },
        });
        // eslint-disable-next-line no-console
        console.log("Dashboard metrics response:", response.data);
        setMetrics(response.data);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch metrics:", err);
        // eslint-disable-next-line no-console
        console.error("Error details:", err.response?.data);
        showToast(extractErrorMessage(err) || "Failed to load dashboard metrics", "error");
        setMetrics(null);
      } finally {
        setLoadingMetrics(false);
        metricsFetchRef.current = false;
      }
    };
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id, token, role, showToast]);

  // Use refs to track if requests are already in progress
  const jobsFetchRef = useRef(false);

  // Fetch jobs and projects for freelancers/jobseekers
  useEffect(() => {
    // Skip if already fetching
    if (jobsFetchRef.current) {
      return;
    }

    if (role === "freelancer" || role === "job_seeker") {
      jobsFetchRef.current = true;
      setLoadingData(true);

      const fetchJobsAndProjects = async () => {
        try {
          // eslint-disable-next-line no-console
          console.log("Fetching jobs and projects for role:", role);
          const axiosInstance = axios.create({
            baseURL: API_BASE,
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });
          const [jobsRes, projectsRes] = await Promise.allSettled([
            axiosInstance.get("/jobs"),
            axiosInstance.get("/projects")
          ]);

          // eslint-disable-next-line no-console
          console.log("Jobs response:", jobsRes);
          // eslint-disable-next-line no-console
          console.log("Projects response:", projectsRes);

          if (jobsRes.status === "fulfilled" && Array.isArray(jobsRes.value.data)) {
            // eslint-disable-next-line no-console
            console.log(`Loaded ${jobsRes.value.data.length} jobs`);
            setJobs(jobsRes.value.data);
          } else if (jobsRes.status === "rejected") {
            // eslint-disable-next-line no-console
            console.error("Failed to fetch jobs:", jobsRes.reason);
          }

          if (projectsRes.status === "fulfilled" && Array.isArray(projectsRes.value.data)) {
            // eslint-disable-next-line no-console
            console.log(`Loaded ${projectsRes.value.data.length} projects`);
            setProjects(projectsRes.value.data);
          } else if (projectsRes.status === "rejected") {
            // eslint-disable-next-line no-console
            console.error("Failed to fetch projects:", projectsRes.reason);
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("Failed to fetch jobs/projects:", err);
        } finally {
          setLoadingData(false);
          jobsFetchRef.current = false;
        }
      };
      fetchJobsAndProjects();
    } else {
      setLoadingData(false);
    }
  }, [role, token]);

  return (
    <Box>
      <MetricCards metrics={metrics} loading={loadingMetrics} role={role} />

      {role === "company_admin" && <CompanyDashboard currentUser={user} authToken={token} />}

      {(role === "freelancer" || role === "job_seeker") && <FreelancerDashboard jobs={jobs} projects={projects} loading={loadingData} />}

      {role === "company_admin" && (
        <Box mt={4}>
          <TopCandidates />
        </Box>
      )}
    </Box>
  );
};

export default Dashboard;
