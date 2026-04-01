import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
  IconButton,
  Drawer
} from "@mui/material";
import { Work as WorkIcon, Assignment as ProjectIcon, Close as CloseIcon } from "@mui/icons-material";
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
import { COLORS } from "../../constants";

const jobTypes = Object.values(JobType);
const workModes = Object.values(WorkMode);
const projectTypes = Object.values(ProjectType);
const paymentTypes = Object.values(PaymentType);

const CompanyDashboard = ({ currentUser, authToken }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(null); // null = none, 0 = job, 1 = project
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

  // Use refs to track if requests are already in progress
  const companyPostsFetchRef = useRef(false);

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
      } catch (err) {
        console.error("Failed to fetch company posts:", err);
      } finally {
        setLoadingPosts(false);
        companyPostsFetchRef.current = false;
      }
    };
    fetchCompanyPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.user_id, authToken]);


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
      setActiveTab(null); // Close form after successful submission
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
      // Refresh company posts
      if (companyPostsFetchRef.current === false) {
        companyPostsFetchRef.current = true;
        try {
          const response = await axios.get(`${API_BASE}/get-company-posts`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          setCompanyPosts(response.data.posts || []);
        } catch (err) {
          console.error("Failed to refresh posts:", err);
        } finally {
          companyPostsFetchRef.current = false;
        }
      }
    } catch (err) {
      const msg = err.response?.data?.detail || t("forms.postJobFailed");
      setError(msg);
      console.error("Failed to post job:", err);
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
      setActiveTab(null); // Close form after successful submission
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
      // Refresh company posts
      if (companyPostsFetchRef.current === false) {
        companyPostsFetchRef.current = true;
        try {
          const response = await axios.get(`${API_BASE}/get-company-posts`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          setCompanyPosts(response.data.posts || []);
        } catch (err) {
          console.error("Failed to refresh posts:", err);
        } finally {
          companyPostsFetchRef.current = false;
        }
      }
    } catch (err) {
      const msg = err.response?.data?.detail || t("forms.postProjectFailed");
      setError(msg);
      console.error("Failed to post project:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDrawer = (tabType) => {
    setActiveTab(tabType);
    setError("");
    setSuccessMessage("");
  };

  const handleCloseDrawer = () => {
    setActiveTab(null);
    setError("");
    setSuccessMessage("");
  };

  return (
    <Stack spacing={3}>
      {/* Action Buttons */}
      <Card
        sx={{
          borderLeft: `4px solid ${COLORS.accent.main}`,
          backgroundColor: `${COLORS.accent.lightest}10`,
        }}
      >
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6" sx={{ color: COLORS.accent.dark, fontWeight: 600, flexGrow: 1 }}>
              Create New Post
            </Typography>
            <Button
              variant="contained"
              startIcon={<WorkIcon />}
              onClick={() => handleOpenDrawer(0)}
              sx={{
                background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.dark} 100%)`,
                "&:hover": {
                  background: `linear-gradient(135deg, ${COLORS.primary.dark} 0%, ${COLORS.primary.darker} 100%)`,
                },
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              {t("dashboard.postJob")}
            </Button>
            <Button
              variant="contained"
              startIcon={<ProjectIcon />}
              onClick={() => handleOpenDrawer(1)}
              sx={{
                background: `linear-gradient(135deg, ${COLORS.success.main} 0%, ${COLORS.success.dark} 100%)`,
                "&:hover": {
                  background: `linear-gradient(135deg, ${COLORS.success.dark} 0%, ${COLORS.success.darker} 100%)`,
                },
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              {t("dashboard.postProject")}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Right Drawer for Forms */}
      <Drawer
        anchor="right"
        open={activeTab !== null}
        onClose={handleCloseDrawer}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: "500px", md: "600px" },
            padding: 0,
          },
        }}
      >
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
          {/* Drawer Header */}
          <Box
            sx={{
              p: 3,
              borderBottom: `1px solid ${COLORS.neutral.gray200}`,
              backgroundColor: activeTab === 0 ? COLORS.primary.lightest : COLORS.success.lightest,
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h5" sx={{ fontWeight: 700, color: activeTab === 0 ? COLORS.primary.dark : COLORS.success.dark }}>
                {activeTab === 0 ? t("forms.createJob") : t("forms.createProject")}
              </Typography>
              <IconButton
                onClick={handleCloseDrawer}
                sx={{
                  color: COLORS.neutral.gray600,
                  "&:hover": { backgroundColor: COLORS.neutral.gray100 },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Stack>
          </Box>

          {/* Drawer Content */}
          <Box sx={{ flex: 1, overflow: "auto", p: 3 }}>
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

            {/* Job Form */}
            {activeTab === 0 && (
              <Box component="form" onSubmit={handleJobSubmit} id="job-form">
                <Stack spacing={3}>
                  <Typography variant="body2" color="text.secondary">
                    Fill in the details below to post a new job opening. All fields marked with * are required.
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
              </Box>
            )}

            {/* Project Form */}
            {activeTab === 1 && (
              <Box component="form" onSubmit={handleProjectSubmit} id="project-form">
                <Stack spacing={3}>
                  <Typography variant="body2" color="text.secondary">
                    Fill in the details below to post a new project. All fields marked with * are required.
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
              </Box>
            )}
          </Box>

          {/* Drawer Footer with Action Buttons */}
          <Box
            sx={{
              p: 3,
              borderTop: `1px solid ${COLORS.neutral.gray200}`,
              backgroundColor: COLORS.neutral.gray50,
            }}
          >
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={handleCloseDrawer}
                disabled={loading}
                sx={{ textTransform: "none" }}
              >
                Cancel
              </Button>
              {activeTab === 0 && (
                <Button
                  type="submit"
                  form="job-form"
                  variant="contained"
                  disabled={loading}
                  startIcon={<WorkIcon />}
                  sx={{
                    background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.dark} 100%)`,
                    "&:hover": {
                      background: `linear-gradient(135deg, ${COLORS.primary.dark} 0%, ${COLORS.primary.darker} 100%)`,
                    },
                    textTransform: "none",
                  }}
                >
                  {loading ? t("forms.posting") : t("forms.createJob")}
                </Button>
              )}
              {activeTab === 1 && (
                <Button
                  type="submit"
                  form="project-form"
                  variant="contained"
                  disabled={loading}
                  startIcon={<ProjectIcon />}
                  sx={{
                    background: `linear-gradient(135deg, ${COLORS.success.main} 0%, ${COLORS.success.dark} 100%)`,
                    "&:hover": {
                      background: `linear-gradient(135deg, ${COLORS.success.dark} 0%, ${COLORS.success.darker} 100%)`,
                    },
                    textTransform: "none",
                  }}
                >
                  {loading ? t("forms.posting") : t("forms.createProject")}
                </Button>
              )}
            </Stack>
          </Box>
        </Box>
      </Drawer>

      {/* Overview Section - Only show when no form tab is active */}
      {activeTab === null && (
        <>
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
        </>
      )}

    </Stack>
  );
};

const FreelancerDashboard = ({ jobs, projects, loading, user, token }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [pursuits, setPursuits] = useState(null);
  const [loadingPursuits, setLoadingPursuits] = useState(false);
  const pursuitsFetchRef = useRef(false);

  const role = useMemo(() => {
    let normalizedRole = user?.role || "guest";
    if (normalizedRole === "jobseeker") normalizedRole = "job_seeker";
    return normalizedRole;
  }, [user?.role]);

  // Fetch user pursuits
  useEffect(() => {
    // Skip if already fetching
    if (pursuitsFetchRef.current) {
      return;
    }

    if (!token || (role !== "freelancer" && role !== "job_seeker")) {
      setLoadingPursuits(false);
      return;
    }

    pursuitsFetchRef.current = true;
    setLoadingPursuits(true);

    const fetchPursuits = async () => {
      try {
        const response = await axios.get(`${API_BASE}/user-pursuits`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { role },
          timeout: 10000, // 10 second timeout
        });
        if (response.data.success) {
          setPursuits(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch pursuits:", err);
        // Don't show error to user, just set empty
        setPursuits(null);
      } finally {
        setLoadingPursuits(false);
        pursuitsFetchRef.current = false;
      }
    };

    fetchPursuits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, role]);

  // Combine jobs and projects for display
  const allPosts = useMemo(() => {
    const combined = [
      ...(jobs || []).map((job) => ({
        ...job,
        type: "job",
        title: job.title || job.job_title,
      })),
      ...(projects || []).map((proj) => ({
        ...proj,
        type: "project",
        title: proj.title || proj.project_title,
      })),
    ];
    const shuffled = [...combined].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  }, [jobs, projects]);

  const pursuedJobs = pursuits?.job_prospects || [];
  const pursuedProjects = pursuits?.project_prospects || [];

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

      {/* Pursued Jobs/Projects Section */}
      {(pursuedJobs.length > 0 || pursuedProjects.length > 0) && (
        <Card
          sx={{
            borderLeft: `4px solid ${COLORS.accent.main}`,
            backgroundColor: `${COLORS.accent.lightest}10`,
          }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: COLORS.accent.dark, fontWeight: 600 }}>
              My Pursuits
            </Typography>
            {loadingPursuits ? (
              <Typography variant="body2">{t("common.loading")}</Typography>
            ) : (
              <Stack spacing={2}>
                {pursuedJobs.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Jobs I&apos;ve Pursued ({pursuedJobs.length})
                    </Typography>
                    <TopJobsProjects
                      jobsProjects={pursuedJobs.map((p) => ({
                        ...p,
                        type: "job",
                        title: p.job_title || p.title,
                        id: p.job_id,
                      }))}
                      userRole={role}
                    />
                  </Box>
                )}
                {pursuedProjects.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Projects I&apos;ve Pursued ({pursuedProjects.length})
                    </Typography>
                    <TopJobsProjects
                      jobsProjects={pursuedProjects.map((p) => ({
                        ...p,
                        type: "project",
                        title: p.project_title || p.title,
                        id: p.project_id,
                      }))}
                      userRole={role}
                    />
                  </Box>
                )}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      <Card
        sx={{
          borderLeft: `4px solid ${COLORS.success.main}`,
          backgroundColor: `${COLORS.success.lightest}10`,
        }}
      >
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ color: COLORS.success.dark, fontWeight: 600 }}>
            {role === "job_seeker" ? "Top Jobs" : t("dashboard.topJobsProjects")}
          </Typography>
          {loading ? <Typography variant="body2">{t("common.loading")}</Typography> : <TopJobsProjects jobsProjects={allPosts} userRole={role} />}
        </CardContent>
      </Card>
    </Stack>
  );
};

const Dashboard = () => {
  const { user, token } = useAuth();
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
        const response = await axios.get(`${API_BASE}/dashboard-metrics`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { role },
          timeout: 10000, // 10 second timeout
        });
        setMetrics(response.data);
      } catch (err) {
        console.error("Failed to fetch metrics:", err);
        setMetrics(null);
      } finally {
        setLoadingMetrics(false);
        metricsFetchRef.current = false;
      }
    };
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id, token, role]);

  // Use refs to track if requests are already in progress
  const jobsFetchRef = useRef(false);

  // Fetch jobs and projects for freelancers/jobseekers
  useEffect(() => {
    // Skip if already fetching
    if (jobsFetchRef.current) {
      return;
    }

    if (!token || (role !== "freelancer" && role !== "job_seeker")) {
      setLoadingData(false);
      return;
    }

    jobsFetchRef.current = true;
    setLoadingData(true);

    const fetchJobsAndProjects = async () => {
      try {
        const axiosInstance = axios.create({
          baseURL: API_BASE,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          timeout: 10000, // 10 second timeout
        });
        const [jobsRes, projectsRes] = await Promise.allSettled([
          axiosInstance.get("/jobs"),
          axiosInstance.get("/projects")
        ]);

        if (jobsRes.status === "fulfilled" && Array.isArray(jobsRes.value.data)) {
          setJobs(jobsRes.value.data);
        } else {
          setJobs([]);
        }

        if (projectsRes.status === "fulfilled" && Array.isArray(projectsRes.value.data)) {
          setProjects(projectsRes.value.data);
        } else {
          setProjects([]);
        }
      } catch (err) {
        console.error("Failed to fetch jobs/projects:", err);
        // Set empty arrays on error to prevent hanging
        setJobs([]);
        setProjects([]);
      } finally {
        setLoadingData(false);
        jobsFetchRef.current = false;
      }
    };
    fetchJobsAndProjects();
  }, [role, token]);

  return (
    <Box>
      <MetricCards metrics={metrics} loading={loadingMetrics} role={role} />

      {role === "company_admin" && <CompanyDashboard currentUser={user} authToken={token} />}

      {(role === "freelancer" || role === "job_seeker") && (
        <FreelancerDashboard jobs={jobs} projects={projects} loading={loadingData} user={user} token={token} />
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
