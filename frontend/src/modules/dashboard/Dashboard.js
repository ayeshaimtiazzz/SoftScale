import React, { useMemo, useState, useEffect } from "react";  // <-- This is the ONLY React import
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import TopCandidates from "../../components/TopCandidates";
import TopJobsProjects from "../../components/TopJobsProjects";
import "./Dashboard.css";
import "../../index.css"; // keep global styles
import { FaUsers, FaDollarSign, FaChartLine, FaUserCheck } from "react-icons/fa";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "config";
const readJson = (key, fallback = []) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch (e) {
    return fallback;
  }
};

const DOMAINS = [
  "Healthcare",
  "Information Technology",
  "Software",
  "SaaS",
  "Finance",
  "Education",
  "E-commerce",
  "Marketing",
  "Manufacturing",
  "Retail",
  "Hospitality",
  "Transportation",
  "Telecommunications",
  "Real Estate",
  "Energy",
  "Energy & Utilities",
  "Automotive",
  "Agriculture",
  "Pharmaceuticals",
  "Media",
  "Media & Entertainment",
  "Entertainment",
  "Government",
  "Non-profit",
  "Legal",
  "Other",
  "Research & Development",
  "Cloud Computing",
  "Software Development",
  "Data Science",
  "Automation",
  "Web Development",
  "Mobile Apps",
  "AI & ML",
  "AI",
  "Cybersecurity"
];

const JOB_TYPES = ["full-time", "part-time", "contract","internship"];
const WORK_MODES = ["remote", "hybrid", "on-site"];
const PROJECT_TYPES = ["short-term", "long-term", "General","milestone"];
const PAYMENT_TYPES = ["fixed", "hourly"];

// ======================== COMPANY DASHBOARD ========================
function CompanyDashboard({ jobs, projects, setJobs, setProjects, metrics }) {
  const [showJobForm, setShowJobForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [companyPosts, setCompanyPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const [jobForm, setJobForm] = useState({
    job_title: "",
    job_description: "",
    job_type: "",
    required_experience: "",
    required_skills: "",
    work_mode: "",
    salary: "",
    preferred_domain: "",
    created_at: "",
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
    created_at: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // NEW: Fetch company posts on mount
  useEffect(() => {
    const fetchCompanyPosts = async () => {
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
      const user_id = currentUser.user_id;
      if (!user_id) return;
      try {
        const response = await axios.get(`${API_BASE}/get-company-posts`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
        });
        setCompanyPosts(response.data.posts || []);
      } catch (err) {
        console.error("Failed to fetch company posts:", err);
      } finally {
        setLoadingPosts(false);
      }
    };
    fetchCompanyPosts();
  }, []);


  const handleJobSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const user_id = currentUser.user_id;
    if (!user_id) {
      setError("User not found. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/post-job`, {
        user_id,
        ...jobForm,
        salary: jobForm.salary ? parseFloat(jobForm.salary) : null,
      });
      alert("Job posted successfully!");
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
        created_at: "",
      });
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to post job.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const user_id = currentUser.user_id;
    if (!user_id) {
      setError("User not found. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/post-project`, {
        user_id,
        ...projectForm,
        team_size: projectForm.team_size ? parseInt(projectForm.team_size) : null,
        salary: projectForm.salary ? parseInt(projectForm.salary) : null,
      });
      alert("Project posted successfully!");
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
        created_at: "",
      });
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to post project.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Action buttons */}
      <div className="dashboard-section-actions" style={{ display: "flex", gap: 12, marginBottom: 18 }}>
        <button className="btn-primary" onClick={() => setShowJobForm(!showJobForm)}>
          Post a Job
        </button>
        <button className="btn-primary" onClick={() => setShowProjectForm(!showProjectForm)}>
          Post a Project
        </button>
      </div>
      {error && <div style={{ color: "#cc3b3b", marginBottom: 12 }}>{error}</div>}

      {/* Job form */}
      {showJobForm && (
        <div className="dashboard-form-card">
          <h3>Post Job</h3>
              <form onSubmit={handleJobSubmit}>
                <input required placeholder="Job Title" value={jobForm.job_title} onChange={(e) => setJobForm({ ...jobForm, job_title: e.target.value })} />
                <textarea required placeholder="Job Description" value={jobForm.job_description} onChange={(e) => setJobForm({ ...jobForm, job_description: e.target.value })} rows={4} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc", marginTop: 8 }} />
                <select required value={jobForm.job_type} onChange={(e) => setJobForm({ ...jobForm, job_type: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc", background: "#fff", marginTop: 8 }}>
                  <option value="">Select Job Type</option>
                  {JOB_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                <input placeholder="Required Experience" value={jobForm.required_experience} onChange={(e) => setJobForm({ ...jobForm, required_experience: e.target.value })} />
                <input placeholder="Required Skills (comma-separated)" value={jobForm.required_skills} onChange={(e) => setJobForm({ ...jobForm, required_skills: e.target.value })} />
                <select required value={jobForm.work_mode} onChange={(e) => setJobForm({ ...jobForm, work_mode: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc", background: "#fff", marginTop: 8 }}>
                  <option value="">Select Work Mode</option>
                  {WORK_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                </select>
                <input type="number" step="0.01" placeholder="Salary" value={jobForm.salary} onChange={(e) => setJobForm({ ...jobForm, salary: e.target.value })} />
                <select required value={jobForm.preferred_domain} onChange={(e) => setJobForm({ ...jobForm, preferred_domain: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc", background: "#fff", marginTop: 8 }}>
                  <option value="">Select Preferred Domain</option>
                  {DOMAINS.map((domain) => <option key={domain} value={domain}>{domain}</option>)}
                </select>
                <button type="submit" className="btn-primary" style={{ marginTop: 8 }} disabled={loading}>
                  {loading ? "Posting..." : "Create Job"}
                </button>
              </form>
        </div>
      )}

      {/* Project form */}
      {showProjectForm && (
        <div className="dashboard-form-card">
          <h3>Post Project</h3>
              <form onSubmit={handleProjectSubmit}>
                <input required placeholder="Project Title" value={projectForm.project_title} onChange={(e) => setProjectForm({ ...projectForm, project_title: e.target.value })} />
                <textarea required placeholder="Project Description" value={projectForm.project_description} onChange={(e) => setProjectForm({ ...projectForm, project_description: e.target.value })} rows={4} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc", marginTop: 8 }} />
                <select required value={projectForm.project_type} onChange={(e) => setProjectForm({ ...projectForm, project_type: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc", background: "#fff", marginTop: 8 }}>
                  <option value="">Select Project Type</option>
                  {PROJECT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                <select required value={projectForm.payment_type} onChange={(e) => setProjectForm({ ...projectForm, payment_type: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc", background: "#fff", marginTop: 8 }}>
                  <option value="">Select Payment Type</option>
                  {PAYMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                <select required value={projectForm.work_mode} onChange={(e) => setProjectForm({ ...projectForm, work_mode: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc", background: "#fff", marginTop: 8 }}>
                  <option value="">Select Work Mode</option>
                  {WORK_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                </select>
                <input placeholder="Required Experience" value={projectForm.required_experience} onChange={(e) => setProjectForm({ ...projectForm, required_experience: e.target.value })} />
                <input placeholder="Required Skills (comma-separated)" value={projectForm.required_skills} onChange={(e) => setProjectForm({ ...projectForm, required_skills: e.target.value })} />
                <input type="number" placeholder="Team Size" value={projectForm.team_size} onChange={(e) => setProjectForm({ ...projectForm, team_size: e.target.value })} />
                <input placeholder="Duration" value={projectForm.duration} onChange={(e) => setProjectForm({ ...projectForm, duration: e.target.value })} />
                <select required value={projectForm.domain} onChange={(e) => setProjectForm({ ...projectForm, domain: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc", background: "#fff", marginTop: 8 }}>
                  <option value="">Select Domain</option>
                  {DOMAINS.map((domain) => <option key={domain} value={domain}>{domain}</option>)}
                </select>
                <input type="number" placeholder="Budget/Salary" value={projectForm.salary} onChange={(e) => setProjectForm({ ...projectForm, salary: e.target.value })} />
                <button type="submit" className="btn-primary" style={{ marginTop: 8 }} disabled={loading}>
                  {loading ? "Posting..." : "Create Project"}
                </button>
              </form>
        </div>
      )}



      {/* Only company sees candidates */}
      <div style={{ marginTop: 28 }}>
        <TopJobsProjects jobsProjects={companyPosts} isCompanyAdmin={true} />
      </div>
    </div>
  );
}

// ======================== FREELANCER / JOBSEEKER ========================
function FreelancerDashboard({ jobs, projects }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchedJobs, setFetchedJobs] = useState([]);
  const [fetchedProjects, setFetchedProjects] = useState([]);

  // Fetch jobs and projects from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const axiosInstance = axios.create({
          baseURL: API_BASE,
          headers: {
            "Content-Type": "application/json",
            ...(localStorage.getItem("authToken") ? { Authorization: `Bearer ${localStorage.getItem("authToken")}` } : {}),
          },
        });
        const [jobsRes, projectsRes] = await Promise.allSettled([axiosInstance.get("/jobs"), axiosInstance.get("/projects")]);
        if (jobsRes.status === "fulfilled" && Array.isArray(jobsRes.value.data)) {
          setFetchedJobs(jobsRes.value.data);
        }
        if (projectsRes.status === "fulfilled" && Array.isArray(projectsRes.value.data)) {
          setFetchedProjects(projectsRes.value.data);
        }
      } catch (err) {
        console.error("Failed to fetch jobs/projects:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const allPosts = useMemo(() => {
    const combined = [
      ...(fetchedJobs || []).map((job) => ({ ...job, title: job.title || job.job_title })),
      ...(fetchedProjects || []).map((proj) => ({ ...proj, title: proj.title || proj.project_title })),
    ];
    const shuffled = [...combined].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  }, [fetchedJobs, fetchedProjects]);

  return (
    <div>
      <button className="btn-primary" onClick={() => navigate("/talent-match")} style={{ marginBottom: 12 }}>
        Find Matches
      </button>
      <div style={{ marginTop: 14 }}>
        <h3>Top Jobs & Projects</h3>
        {loading ? <p>Loading...</p> : <TopJobsProjects jobsProjects={allPosts} />}
      </div>

      {results.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <h3>Search Results</h3>
          <div className="list-grid">
            {results.map((r, i) => (
              <div key={i} className="dashboard-item-card">
                <strong>{r.job_title || r.project_title}</strong>
                <p className="muted">{(r.job_description || r.project_description || "").slice(0, 120)}...</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const JobSeekerDashboard = FreelancerDashboard;

// ======================== MAIN DASHBOARD ========================
function Dashboard() {
  const jobs = readJson("jobs", []);
  const projects = readJson("projects", []);
  const freelancerProfiles = readJson("freelancerProfiles", []);
  const jobSeekerProfiles = readJson("jobSeekerProfiles", []);
  const companyProfiles = readJson("companyProfiles", []);

  const metrics = {
    activeCandidates: freelancerProfiles.length + jobSeekerProfiles.length || 2847,
    avgMatchScore: 87,
    revenueThisMonth: localStorage.getItem("revenueThisMonth") || 124500,
    activeDeals: localStorage.getItem("activeDeals") || 47,
  };

  let role = "guest";
  try {
    const cu = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (cu?.role) role = cu.role;
    else if (cu?.email) {
      const email = cu.email;
      if (companyProfiles.find(c => c.user_id === email || c.company_name === email)) role = "company";
      else if (freelancerProfiles.find(f => f.email === email)) role = "freelancer";
      else if (jobSeekerProfiles.find(j => j.email === email)) role = "jobseeker";
    }
  } catch {
    role = "guest";
  }

  const [jobsState, setJobsState] = useState(jobs);
  const [projectsState, setProjectsState] = useState(projects);

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <Header />
        <div className="dashboard-content">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div>
              <h1 className="dashboard-title">Dashboard</h1>
              <p style={{ margin: 0, color: "#556070" }}>Welcome back</p>
            </div>
          </div>



          {/* Role-specific section */}
          <div style={{ marginTop: 22 }}>
            {role === "company_admin" && (
              <CompanyDashboard jobs={jobsState} projects={projectsState} setJobs={setJobsState} setProjects={setProjectsState} metrics={metrics} />
            )}
            {role === "freelancer" && <FreelancerDashboard jobs={jobsState} projects={projectsState} />}
            {role === "jobseeker" && <FreelancerDashboard jobs={jobsState} projects={projectsState} />}
          </div>
        </div>
      </div>
    </div>
  );
}
export default Dashboard;
