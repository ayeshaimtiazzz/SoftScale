import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Typography,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  TextField,
  MenuItem,
  Stack,
} from "@mui/material";
import { LocationOn, Work, School, AccessTime, Visibility, Star, TrendingUp, SearchOutlined, Add as AddIcon, Description as DescriptionIcon } from "@mui/icons-material";
import "./styles.css";
import { API_BASE } from "config";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../providers/ToastProvider";
import PageTitle from "../../components/common/PageTitle";
import { useTranslation } from "react-i18next";
import { COLORS, COUNTRY_CITY, SALARY_RANGES, EXPERIENCE_LEVELS, JOB_TYPES, PROJECT_TYPES, WORK_MODES, API_ENDPOINTS } from "../../constants";
import { getUserRole, getCurrentUser } from "../../utils/storage";
import { axiosInstance as tokenRefreshAxiosInstance } from "../../utils/tokenRefresh";

const readJson = (key, fallback = []) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
};

const TalentMatch = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  // Properly get role from auth context or storage
  const role = useMemo(() => {
    // Priority 1: Use user from auth context
    if (user && user.role) {
      const userRole = user.role;
      // Normalize role name for backend compatibility
      return userRole === "jobseeker" ? "job_seeker" : userRole;
    }

    // Priority 2: Use role from localStorage (STORAGE_KEYS.USER_ROLE)
    const storedRole = getUserRole();
    if (storedRole && storedRole !== "guest") {
      return storedRole === "jobseeker" ? "job_seeker" : storedRole;
    }

    // Priority 3: Check currentUser from localStorage
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.role) {
      const userRole = currentUser.role;
      return userRole === "jobseeker" ? "job_seeker" : userRole;
    }

    // Only default to guest if user is not authenticated
    return token ? null : "guest";
  }, [user, token]);

  const [filters, setFilters] = useState({
    country: "",
    city: "",
    salaryRange: "",
    experience: "",
    jobType: "",
    workModel: "",
    topK: 5,
  });

  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [companyPosts, setCompanyPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [loadingAvailableProjects, setLoadingAvailableProjects] = useState(false);
  const [selectedTalents, setSelectedTalents] = useState([]); // For bulk deal creation

  // Use the axiosInstance from tokenRefresh which has interceptors and auto token refresh
  // This ensures we always use the latest token and handle 401s automatically
  const axiosInstance = useMemo(() => tokenRefreshAxiosInstance, []);

  useEffect(() => {
    const post = JSON.parse(localStorage.getItem("selectedPost") || "null");
    if (post) {
      setSelectedPost(post);
      localStorage.removeItem("selectedPost");
    }
  }, []);

  // Fetch company posts for company_admin if no selectedPost
  useEffect(() => {
    const fetchCompanyPosts = async () => {
      // Only fetch if user is company_admin and has no selectedPost
      if ((role === "company" || role === "company_admin") && !selectedPost && token) {
        setLoadingPosts(true);
        try {
          const response = await axiosInstance.get(API_ENDPOINTS.GET_COMPANY_POSTS);
          const posts = response.data.posts || [];
          setCompanyPosts(posts);

          // Auto-select the first post if available
          if (posts.length > 0) {
            const firstPost = posts[0];
            // Determine post type and ID
            const postId = firstPost.job_id || firstPost.project_id || firstPost.id;
            const postType = firstPost.job_id ? "job" : firstPost.project_id ? "project" : firstPost.type;
            const postTitle = firstPost.job_title || firstPost.project_title || firstPost.title || "Untitled";

            if (postId && postType) {
              setSelectedPost({
                id: postId,
                type: postType,
                title: postTitle,
              });
            }
          }
        } catch (err) {
          console.error("Failed to fetch company posts:", err);
          setError("Failed to load your posts. Please try again.");
        } finally {
          setLoadingPosts(false);
        }
      }
    };

    fetchCompanyPosts();
  }, [role, selectedPost, token, axiosInstance]);

  // Fetch available projects for company_admin to pursue as deals
  useEffect(() => {
    const fetchAvailableProjects = async () => {
      if ((role === "company" || role === "company_admin") && token) {
        setLoadingAvailableProjects(true);
        try {
          // console.log("[TalentMatch] Fetching available projects for deals...");
          const response = await axiosInstance.get("/available-projects-for-deals");
          // console.log("[TalentMatch] Available projects response:", response.data);
          // Handle both array and object responses
          const projects = Array.isArray(response.data) ? response.data : (response.data?.projects || response.data?.data || []);
          // console.log("[TalentMatch] Parsed projects:", projects);
          setAvailableProjects(projects);
        } catch (err) {
          // console.error("[TalentMatch] Failed to fetch available projects:", err);
          // console.error("[TalentMatch] Error details:", err.response?.data);
          showToast(`Failed to load available projects: ${err.response?.data?.detail || err.message}`, "error");
          setAvailableProjects([]);
        } finally {
          setLoadingAvailableProjects(false);
        }
      }
    };
    fetchAvailableProjects();
  }, [role, token, axiosInstance, showToast]);

  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      setLoading(true);
      try {
        console.log("[TalentMatch] Fetching jobs, projects, and candidates...");
        const [jobsRes, projectsRes, candidatesRes] = await Promise.allSettled([
          axiosInstance.get("/jobs"),
          axiosInstance.get("/projects"),
          axiosInstance.get("/candidates"),
        ]);
        if (mounted) {
          if (jobsRes.status === "fulfilled" && Array.isArray(jobsRes.value.data)) {
            console.log("[TalentMatch] Jobs fetched:", jobsRes.value.data.length);
            // Data available for future use
          } else {
            console.error("[TalentMatch] Jobs fetch failed:", jobsRes.reason);
          }
          if (projectsRes.status === "fulfilled" && Array.isArray(projectsRes.value.data)) {
            console.log("[TalentMatch] Projects fetched:", projectsRes.value.data.length);
            // Data available for future use
          } else {
            console.error("[TalentMatch] Projects fetch failed:", projectsRes.reason);
          }
          if (candidatesRes.status === "fulfilled" && Array.isArray(candidatesRes.value.data)) {
            console.log("[TalentMatch] Candidates fetched:", candidatesRes.value.data.length);
            // Data available for future use
          } else {
            console.error("[TalentMatch] Candidates fetch failed:", candidatesRes.reason);
          }
        }
      } catch (error) {
        console.error("[TalentMatch] Error fetching data:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchAll();
    return () => {
      mounted = false;
    };
  }, [axiosInstance]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newValue = name === "topK" ? parseInt(value) || 5 : value;
    console.log("Filter changed:", name, "=", newValue);
    setFilters((prev) => {
      const updated = {
        ...prev,
        [name]: newValue,
        ...(name === "country" ? { city: "" } : {}),
      };
      console.log("Updated filters:", updated);
      return updated;
    });
  };

  // Trigger search when filters, role, or selectedPost changes
  useEffect(() => {
    console.log(
      "useEffect triggered - token:",
      !!token,
      "role:",
      role,
      "selectedPost:",
      selectedPost,
      "selectedPost?.id:",
      selectedPost?.id,
      "filters:",
      filters
    );

    // Don't search if not authenticated
    if (!token) {
      console.log("No token, skipping search");
      return;
    }

    // Don't search if role is guest or null (not determined yet)
    if (!role || role === "guest") {
      console.log("Role is guest or not determined, skipping search. Role:", role);
      return;
    }

    // For company admins, wait for selectedPost or for posts to finish loading
    if (role === "company" || role === "company_admin") {
      // If still loading posts, wait
      if (loadingPosts) {
        console.log("Loading company posts, waiting...");
        return;
      }
      // If no selectedPost and no posts available, show error
      if (!selectedPost || !selectedPost.id) {
        if (companyPosts.length === 0) {
          setError("No job or project found. Please create a job or project first.");
        } else {
          console.log("Company admin but no selectedPost or selectedPost.id, skipping search. selectedPost:", selectedPost);
        }
        return;
      }
    }

    console.log("All conditions met, performing search for role:", role);

    // Build search payload function - inside useEffect to use latest filters
    const buildSearchPayload = () => {
      // Always include top_k (defaults to 5 if not set)
      const payload = { top_k: filters.topK || 5 };

      // Only add filters if they have values (not empty strings)
      if (filters.salaryRange && filters.salaryRange !== "" && SALARY_RANGES.includes(filters.salaryRange)) {
        payload.salary_range = filters.salaryRange;
      }
      if (filters.experience && filters.experience !== "" && EXPERIENCE_LEVELS.includes(filters.experience)) {
        payload.experience_level = filters.experience;
      }
      if (filters.workModel && filters.workModel !== "" && WORK_MODES.includes(filters.workModel)) {
        payload.work_mode = filters.workModel;
      }
      if (filters.country && filters.country !== "") {
        payload.country = filters.country;
      }
      if (filters.city && filters.city !== "") {
        payload.city = filters.city;
      }
      if (role === "freelancer" && filters.jobType && filters.jobType !== "" && PROJECT_TYPES.includes(filters.jobType)) {
        payload.project_type = filters.jobType;
      } else if (
        (role === "jobseeker" || role === "job_seeker") &&
        filters.jobType &&
        filters.jobType !== "" &&
        JOB_TYPES.includes(filters.jobType)
      ) {
        payload.job_type = filters.jobType;
      }

      console.log("Built search payload:", payload);
      return payload;
    };

    // Perform search directly in useEffect to ensure it uses latest filters
    const performSearch = async () => {
      console.log("Starting API call...");
      setLoading(true);
      setError("");

      const payload = buildSearchPayload();
      if ((role === "company" || role === "company_admin") && selectedPost && selectedPost.id) {
        payload.post_id = selectedPost.id;
      }

      console.log("Talent match request - Role:", role, "Payload:", payload);
      console.log("API Base:", API_BASE);
      console.log("Axios instance exists:", !!axiosInstance);
      console.log("Axios instance baseURL:", axiosInstance?.defaults?.baseURL);

      try {
        console.log("Making API call to /talent-match with params:", payload);
        const res = await axiosInstance.get("/talent-match", { params: payload });
        console.log("Talent match API response:", res.data);
        const matches = res.data.matches || [];
        console.log(`Found ${matches.length} matches`);
        setSearchResults(matches);
        if (
          matches.length === 0 &&
          filters.country === "" &&
          filters.city === "" &&
          filters.salaryRange === "" &&
          filters.experience === "" &&
          filters.workModel === "" &&
          filters.jobType === ""
        ) {
          // Only show error if no filters are applied and no matches found
          setError("No matches found. Try adjusting your filters.");
        } else if (matches.length === 0) {
          setError("No matches found with the current filters. Try adjusting them.");
        } else {
          setError(""); // Clear error if matches are found
        }
      } catch (err) {
        console.error("Talent match error:", err);
        console.error("Error response:", err.response);
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
        const errorMsg = err.response?.data?.detail || err.message || "Failed to fetch matches. Try again.";
        setError(errorMsg);
        setSearchResults([]);
      } finally {
        console.log("Search completed, setting loading to false");
        setLoading(false);
      }
    };

    performSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.country,
    filters.city,
    filters.salaryRange,
    filters.experience,
    filters.jobType,
    filters.workModel,
    filters.topK,
    role,
    selectedPost?.id, // Use selectedPost.id to trigger when post changes
    token,
    loadingPosts, // Wait for posts to finish loading
    companyPosts.length, // Re-check when posts are loaded
    // Note: axiosInstance is memoized and only changes when token changes, so we don't need it in deps
    // Including it could cause unnecessary re-runs. We use it inside the effect but don't track it.
  ]);

  const availableCities = useMemo(() => {
    if (!filters.country) return ["Select City"];
    return COUNTRY_CITY[filters.country] || [];
  }, [filters.country]);

  // Client-side filtering of available projects (for company admins)
  // Show all projects if no filters are applied, otherwise filter leniently (include projects with missing data)
  const filteredAvailableProjects = useMemo(() => {
    if (!availableProjects || availableProjects.length === 0) return [];

    // If no filters are applied, show all projects
    const hasActiveFilters = filters.country || filters.city || filters.workModel || filters.experience || filters.jobType || filters.salaryRange;
    if (!hasActiveFilters) {
      return availableProjects;
    }

    return availableProjects.filter((project) => {
      // Country filter - only exclude if filter is set AND project has country AND they don't match
      const countryMatch = filters.country
        ? (!project.country || project.country === filters.country)
        : true;

      // City filter - only exclude if filter is set AND project has city AND they don't match
      const cityMatch = filters.city
        ? (!project.city || project.city === filters.city)
        : true;

      // Work mode filter - only exclude if filter is set AND project has work_mode AND they don't match
      const workModelMatch = filters.workModel
        ? (!project.work_mode || project.work_mode === filters.workModel)
        : true;

      // Experience level filter - only exclude if filter is set AND project has experience_level AND they don't match
      const experienceMatch = filters.experience
        ? (!project.experience_level || project.experience_level === filters.experience)
        : true;

      // Project type filter - only exclude if filter is set AND project has project_type AND they don't match
      const projectTypeMatch = filters.jobType
        ? (!project.project_type || project.project_type === filters.jobType)
        : true;

      // Salary range filter - include projects without salary info, only filter if salary exists
      const salaryMatch = filters.salaryRange
        ? (() => {
            const projectSalary = project.salary || (project.salaryRange ? parseFloat(project.salaryRange.replace(/[$,]/g, "")) : null);
            // If no salary info, include the project (don't exclude it)
            if (!projectSalary) return true;

            const [min, max] = filters.salaryRange.split(" - ").map((s) => parseInt(s.replace(/,/g, "").replace("+", "")));
            if (filters.salaryRange === "5,000+") return projectSalary >= 5000;
            return projectSalary >= min && (max ? projectSalary <= max : true);
          })()
        : true;

      return countryMatch && cityMatch && workModelMatch && experienceMatch && projectTypeMatch && salaryMatch;
    });
  }, [availableProjects, filters.country, filters.city, filters.workModel, filters.experience, filters.jobType, filters.salaryRange]);

  // Client-side filtering of searchResults
  const filteredResults = useMemo(() => {
    return searchResults.filter((item) => {
      if (role === "company" || role === "company_admin") {
        // Filtering for candidates
        const countryMatch = filters.country ? item.location && item.location.includes(filters.country) : true;
        const cityMatch = filters.city ? item.location && item.location.includes(filters.city) : true;
        const workModelMatch =
          role === "freelancer" || role === "jobseeker" ? (filters.workModel ? item.workModel === filters.workModel : true) : true; // Only apply for freelancers/jobseekers

        // Experience parsing (e.g., "3 years" -> 3, or direct level like "intermediate")
        const expYears = item.experience ? (isNaN(parseInt(item.experience)) ? 0 : parseInt(item.experience.split(" ")[0])) : 0;
        const experienceMatch = filters.experience
          ? (filters.experience === "beginner" && expYears <= 1) ||
            (filters.experience === "intermediate" && expYears >= 2 && expYears <= 4) ||
            (filters.experience === "expert" && expYears >= 5) ||
            item.experience === filters.experience
          : true;

        // Salary range (assumes item has salaryRange as string, e.g., "500 - 1,000")
        const salaryMatch = filters.salaryRange
          ? (() => {
              if (!item.salaryRange) return true;
              const [min, max] = filters.salaryRange.split(" - ").map((s) => parseInt(s.replace(",", "").replace("+", "")));
              const itemSalary = parseInt(item.salaryRange.split(" - ")[0] || item.salaryRange);
              if (filters.salaryRange === "5,000+") return itemSalary >= 5000;
              return itemSalary >= min && (max ? itemSalary <= max : true);
            })()
          : true;

        return countryMatch && cityMatch && workModelMatch && experienceMatch && salaryMatch;
      } else {
        // Filtering for jobs/projects
        const countryMatch = filters.country ? item.country === filters.country : true;
        const cityMatch = filters.city ? item.city === filters.city : true;
        const workModelMatch =
          role === "freelancer" || role === "jobseeker" ? (filters.workModel ? item.work_mode === filters.workModel : true) : true; // Only apply for freelancers/jobseekers
        const experienceMatch = filters.experience ? item.experience_level === filters.experience : true;

        // Job/Project type
        const typeMatch = filters.jobType
          ? role === "freelancer"
            ? item.project_type === filters.jobType
            : item.job_type === filters.jobType
          : true;

        // Salary range (if present)
        const salaryMatch = filters.salaryRange
          ? (() => {
              if (!item.salaryRange) return true;
              const [min, max] = filters.salaryRange.split(" - ").map((s) => parseInt(s.replace(",", "").replace("+", "")));
              const itemSalary = parseInt(item.salaryRange.split(" - ")[0] || item.salaryRange);
              if (filters.salaryRange === "5,000+") return itemSalary >= 5000;
              return itemSalary >= min && (max ? itemSalary <= max : true);
            })()
          : true;

        return countryMatch && cityMatch && workModelMatch && experienceMatch && typeMatch && salaryMatch;
      }
    });
  }, [searchResults, filters, role]);

  // Handler for navigating to talent details page
  const handleViewDetails = (item) => {
    navigate("/talent-details", { state: { item, role } }); // Pass the item and role in state
  };

  // Handler for generating proposal from talent match
  const handleGenerateProposal = async (item) => {
    try {
      const authToken = token || localStorage.getItem("authToken");

      if (!authToken) {
        showToast("Please log in to generate proposals", "error");
        return;
      }

      // Prepare proposal generation data
      const proposalData = {
        talent_id: String(item.id || item.candidate_id || item.freelancer_id || ""),
        talent_name: item.name || "Unknown",
        match_score: item.match_score || item.score || null,
        skills: item.skills || "",
        experience: item.experience || "",
        job_id: selectedPost?.type === "job" ? selectedPost.id : null,
        project_id: selectedPost?.type === "project" ? selectedPost.id : null,
        job_title: selectedPost?.type === "job" ? selectedPost.title : null,
        project_title: selectedPost?.type === "project" ? selectedPost.title : null,
        job_description: null, // Could be fetched if needed
        project_description: null, // Could be fetched if needed
        company_name: user?.company_name || user?.name || "",
        tone: "Professional",
        create_deal: true, // Create deal and link proposal
      };

      // Navigate to proposal generation page with pre-filled data
      navigate("/proposal-generation", {
        state: {
          fromMatch: true,
          proposalData: proposalData,
        },
      });
    } catch (error) {
      console.error("Error preparing proposal generation:", error);
      showToast("Failed to prepare proposal generation", "error");
    }
  };

  // Handler for pursuing a project as a deal
  const handlePursueAsDeal = async (projectId) => {
    try {
      const authToken = token || localStorage.getItem("authToken");

      if (!authToken) {
        showToast("Please log in to pursue projects as deals", "error");
        return;
      }

      // Deal routes are at /deals not /api/deals (deal_router has no prefix)
      const dealsBaseUrl = API_BASE.replace('/api', '');
      const response = await axios.post(
        `${dealsBaseUrl}/deals/from-project/${projectId}`,
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      showToast("Deal created successfully! You can view it in your CRM.", "success");

      // Optionally navigate to CRM after a short delay
      setTimeout(() => {
        navigate("/crm", { state: { highlightDealId: response.data.deal_id || response.data.id } });
      }, 1500);
    } catch (error) {
      console.error("Error creating deal from project:", error);
      showToast(error.response?.data?.detail || "Failed to create deal from project", "error");
    }
  };

  // Handler for creating a deal from job (for freelancers and job seekers)
  const handleCreateDealFromJob = async (item) => {
    try {
      const authToken = token || localStorage.getItem("authToken");

      if (!authToken) {
        showToast("Please log in to create deals", "error");
        return;
      }

      const jobId = item.id || item.job_id;
      if (!jobId) {
        showToast("Invalid job ID", "error");
        return;
      }

      const dealsBaseUrl = API_BASE.replace('/api', '');
      const response = await axios.post(
        `${dealsBaseUrl}/deals/from-job/${jobId}`,
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      showToast("Deal created successfully! Redirecting to Deal Management...", "success");

      setTimeout(() => {
        navigate("/crm", { state: { highlightDealId: response.data.deal_id || response.data.id } });
      }, 1500);
    } catch (error) {
      console.error("Failed to create deal from job:", error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || "Failed to create deal";
      showToast(errorMessage, "error");
    }
  };

  // Handler for creating a deal from project (for freelancers only)
  const handleCreateDealFromProject = async (item) => {
    try {
      const authToken = token || localStorage.getItem("authToken");

      if (!authToken) {
        showToast("Please log in to create deals", "error");
        return;
      }

      const projectId = item.id || item.project_id;
      if (!projectId) {
        showToast("Invalid project ID", "error");
        return;
      }

      const dealsBaseUrl = API_BASE.replace('/api', '');
      const response = await axios.post(
        `${dealsBaseUrl}/deals/from-project-freelancer/${projectId}`,
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      showToast("Deal created successfully! Redirecting to Deal Management...", "success");

      setTimeout(() => {
        navigate("/crm", { state: { highlightDealId: response.data.deal_id || response.data.id } });
      }, 1500);
    } catch (error) {
      console.error("Failed to create deal from project:", error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || "Failed to create deal";
      showToast(errorMessage, "error");
    }
  };

  // Handler for creating a deal from talent match result
  const handleCreateDeal = async (item) => {
    try {
      const authToken = token || localStorage.getItem("authToken");

      if (!authToken) {
        showToast("Please log in to create deals", "error");
        return;
      }

      // Deal routes are at /deals not /api/deals (deal_router has no prefix)
      const dealsBaseUrl = API_BASE.replace('/api', '');

      // Check if deal already exists by fetching all deals
      try {
        const existingDealsResponse = await axios.get(`${dealsBaseUrl}/deals`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const existingDeals = existingDealsResponse.data.deals || [];

        // Check if deal already exists for this talent
        const existingDeal = existingDeals.find(
          (deal) =>
            deal.talent_id === (item.id || item.candidate_id || item.freelancer_id) ||
            deal.talent_name === item.name
        );

        if (existingDeal) {
          showToast("Deal already exists for this talent", "info");
          // Navigate to CRM and highlight the existing deal
          navigate("/crm", { state: { highlightDealId: existingDeal.deal_id || existingDeal.id } });
          return;
        }
      } catch (error) {
        // If API call fails, continue with creation (might be first deal)
        console.log("Could not check existing deals:", error);
      }

      // Prepare deal data with descriptive title
      const candidateName = item.name || "Talent";
      const candidateRole = item.role || item.title || item.experience_level || "";
      const candidateDomain = item.domain || "";
      const candidateSkills = item.skills ? (Array.isArray(item.skills) ? item.skills.join(", ") : String(item.skills)).split(",")[0].trim() : "";

      // Build descriptive deal title with context
      let dealTitle = `Hiring ${candidateName}`;
      if (candidateRole && candidateDomain) {
        dealTitle = `Hiring ${candidateName} - ${candidateRole} (${candidateDomain})`;
      } else if (candidateRole) {
        dealTitle = `Hiring ${candidateName} - ${candidateRole}`;
      } else if (candidateDomain) {
        dealTitle = `Hiring ${candidateName} (${candidateDomain})`;
      } else if (candidateSkills) {
        dealTitle = `Hiring ${candidateName} - ${candidateSkills}`;
      }

      const dealData = {
        deal_title: dealTitle,
        talent_name: candidateName,
        talent_id: String(item.id || item.candidate_id || item.freelancer_id || ""),
        company_name: user?.company_name || user?.name || "",
        stage: "Prospecting",
        status: "active",
        value: item.expected_salary || (item.hourly_rate ? item.hourly_rate * 160 : null),
        probability: 30,
        expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days from now
        description: `Prospect discovered through Talent Match. ${item.skills ? `Skills: ${item.skills}. ` : ""}${item.experience ? `Experience: ${item.experience}. ` : ""}${item.domain ? `Domain: ${item.domain}.` : ""}`,
        tags: [item.domain || "General", "Talent Match", item.experience_level || "Not Specified"],
        lead_source: "talent_match",
        match_score: item.match_score || item.score || null,
        skills: item.skills || "",
        experience: item.experience || "",
        location: item.location || "",
        work_model: item.workModel || item.work_preference || "",
      };

      // Create deal via API
      const response = await axios.post(
        `${dealsBaseUrl}/deals`,
        dealData,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      console.log("Deal created successfully:", response.data);

      showToast("Deal created successfully! Redirecting to Deal Management...", "success");

      // Navigate to CRM page after a short delay
      // Use deal_id from response (could be deal_id or id field)
      const dealId = response.data?.deal_id || response.data?.id || response.data?.dealId;
      setTimeout(() => {
        navigate("/crm", {
          state: {
            highlightDealId: dealId,
            refreshDeals: true // Flag to refresh deals on CRM page
          }
        });
      }, 1000);
    } catch (error) {
      console.error("Error creating deal:", error);
      console.error("Error response:", error.response?.data);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || "Failed to create deal";
      showToast(errorMessage, "error");
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    return parts[0][0] + (parts[1] ? parts[1][0] : "");
  };

  const getAvatarColor = (name) => {
    const colors = [COLORS.primary.main, COLORS.info.main, COLORS.success.main, COLORS.accent.main, COLORS.secondary.main];
    const index = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  return (
    <Box sx={{ p: 3, backgroundColor: COLORS.neutral.gray50, minHeight: "100vh" }}>
      <PageTitle
        title={role === "company" || role === "company_admin" ? "Top Candidates" : "Top Jobs & Projects"}
        subtitle={t("navigation.leadDiscoveryDesc")}
        icon={<SearchOutlined sx={{ fontSize: "2rem" }} />}
        color={COLORS.success.main}
      />

      <Grid container spacing={3}>
        {/* Main Content Grid */}
        <Grid item xs={12} md={8}>
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress sx={{ color: COLORS.primary.main }} />
            </Box>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {!loading && !error && filteredResults.length === 0 && (
            <Paper
              sx={{
                p: 4,
                textAlign: "center",
                backgroundColor: COLORS.neutral.white,
                borderRadius: 2,
              }}
            >
              <Typography variant="body1" color="text.secondary">
                Sorry, no matches found. Try adjusting your filters.
              </Typography>
            </Paper>
          )}

          <Grid container spacing={2}>
            {!loading &&
              !error &&
              filteredResults.slice(0, filters.topK).map((item, index) =>
                role === "company" || role === "company_admin" ? (
                  <Grid item xs={12} sm={6} key={index}>
                    <Card
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        borderLeft: `4px solid ${getAvatarColor(item.name)}`,
                        boxShadow: `0 2px 8px ${COLORS.neutral.gray300}`,
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        "&:hover": {
                          transform: "translateY(-8px)",
                          boxShadow: `0 8px 24px ${getAvatarColor(item.name)}40`,
                          borderLeft: `4px solid ${getAvatarColor(item.name)}`,
                        },
                        cursor: "pointer",
                        position: "relative",
                        overflow: "hidden",
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: "4px",
                          background: `linear-gradient(90deg, ${getAvatarColor(item.name)}, ${COLORS.primary.light})`,
                          opacity: 0,
                          transition: "opacity 0.3s",
                        },
                        "&:hover::before": {
                          opacity: 1,
                        },
                      }}
                      onClick={() => handleViewDetails(item)}
                    >
                      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                          <Avatar
                            sx={{
                              bgcolor: getAvatarColor(item.name),
                              width: 56,
                              height: 56,
                              fontSize: "1.5rem",
                              fontWeight: 700,
                              mr: 2,
                              boxShadow: `0 4px 12px ${getAvatarColor(item.name)}50`,
                            }}
                          >
                            {getInitials(item.name)}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 700,
                                color: COLORS.primary.dark,
                                mb: 0.5,
                              }}
                            >
                              {item.name}
                            </Typography>
                            {item.domain && (
                              <Chip
                                label={item.domain}
                                size="small"
                                sx={{
                                  bgcolor: `${COLORS.info.lightest}40`,
                                  color: COLORS.info.dark,
                                  fontWeight: 500,
                                  fontSize: "0.75rem",
                                }}
                              />
                            )}
                          </Box>
                        </Box>

                        <Stack spacing={1}>
                          {item.skills && (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <School sx={{ fontSize: 18, color: COLORS.info.main }} />
                              <Typography variant="body2" color="text.secondary">
                                <strong>Skills:</strong> {item.skills}
                              </Typography>
                            </Box>
                          )}
                          {item.experience && (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <AccessTime sx={{ fontSize: 18, color: COLORS.accent.main }} />
                              <Typography variant="body2" color="text.secondary">
                                <strong>Experience:</strong> {item.experience}
                              </Typography>
                            </Box>
                          )}
                          {item.workModel && (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Work sx={{ fontSize: 18, color: COLORS.success.main }} />
                              <Typography variant="body2" color="text.secondary">
                                <strong>Work Model:</strong> {item.workModel || "N/A"}
                              </Typography>
                            </Box>
                          )}
                          {item.location && (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <LocationOn sx={{ fontSize: 18, color: COLORS.secondary.main }} />
                              <Typography variant="body2" color="text.secondary">
                                {item.location}
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                      </CardContent>
                      <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
                        <Button
                          variant="outlined"
                          fullWidth
                          startIcon={<Visibility />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(item);
                          }}
                          sx={{
                            borderColor: COLORS.primary.main,
                            color: COLORS.primary.main,
                            "&:hover": {
                              borderColor: COLORS.primary.dark,
                              backgroundColor: `${COLORS.primary.lightest}20`,
                            },
                            textTransform: "none",
                            fontWeight: 600,
                          }}
                        >
                          View Profile
                        </Button>
                        {(role === "company" || role === "company_admin") && (
                          <>
                            <Button
                              variant="contained"
                              fullWidth
                              startIcon={<DescriptionIcon />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateProposal(item);
                              }}
                              sx={{
                                background: `linear-gradient(135deg, ${COLORS.accent.main} 0%, ${COLORS.accent.dark} 100%)`,
                                "&:hover": {
                                  background: `linear-gradient(135deg, ${COLORS.accent.dark} 0%, ${COLORS.accent.darker} 100%)`,
                                  boxShadow: `0 4px 12px ${COLORS.accent.main}50`,
                                },
                                textTransform: "none",
                                fontWeight: 600,
                              }}
                            >
                              Generate Proposal
                            </Button>
                            <Button
                              variant="contained"
                              fullWidth
                              startIcon={<AddIcon />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCreateDeal(item);
                              }}
                              sx={{
                                background: `linear-gradient(135deg, ${COLORS.success.main} 0%, ${COLORS.success.dark} 100%)`,
                                "&:hover": {
                                  background: `linear-gradient(135deg, ${COLORS.success.dark} 0%, ${COLORS.success.darker} 100%)`,
                                  boxShadow: `0 4px 12px ${COLORS.success.main}50`,
                                },
                                textTransform: "none",
                                fontWeight: 600,
                              }}
                            >
                              Create Deal
                            </Button>
                          </>
                        )}
                      </CardActions>
                    </Card>
                  </Grid>
                ) : (
                  <Grid item xs={12} sm={6} key={index}>
                    <Card
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        borderLeft: `4px solid ${getAvatarColor(item.title || item.name)}`,
                        boxShadow: `0 2px 8px ${COLORS.neutral.gray300}`,
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        "&:hover": {
                          transform: "translateY(-8px)",
                          boxShadow: `0 8px 24px ${getAvatarColor(item.title || item.name)}40`,
                          borderLeft: `4px solid ${getAvatarColor(item.title || item.name)}`,
                        },
                        cursor: "pointer",
                        position: "relative",
                        overflow: "hidden",
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: "4px",
                          background: `linear-gradient(90deg, ${getAvatarColor(item.title || item.name)}, ${COLORS.success.light})`,
                          opacity: 0,
                          transition: "opacity 0.3s",
                        },
                        "&:hover::before": {
                          opacity: 1,
                        },
                      }}
                      onClick={() => handleViewDetails(item)}
                    >
                      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                          <Avatar
                            sx={{
                              bgcolor: getAvatarColor(item.title || item.name),
                              width: 56,
                              height: 56,
                              fontSize: "1.5rem",
                              fontWeight: 700,
                              mr: 2,
                              boxShadow: `0 4px 12px ${getAvatarColor(item.title || item.name)}50`,
                            }}
                          >
                            {getInitials(item.title || item.name)}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 700,
                                color: COLORS.primary.dark,
                                mb: 0.5,
                              }}
                            >
                              {item.title || item.name}
                            </Typography>
                            {item.company_name && (
                              <Typography variant="body2" color="text.secondary">
                                {item.company_name}
                              </Typography>
                            )}
                            {(item.preferred_domain || item.domain) && (
                              <Chip
                                label={item.preferred_domain || item.domain}
                                size="small"
                                sx={{
                                  bgcolor: `${COLORS.success.lightest}40`,
                                  color: COLORS.success.dark,
                                  fontWeight: 500,
                                  fontSize: "0.75rem",
                                  mt: 0.5,
                                }}
                              />
                            )}
                          </Box>
                        </Box>

                        <Stack spacing={1}>
                          {item.experience_level && (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <AccessTime sx={{ fontSize: 18, color: COLORS.accent.main }} />
                              <Typography variant="body2" color="text.secondary">
                                <strong>Experience:</strong> {item.experience_level}
                              </Typography>
                            </Box>
                          )}
                          {item.work_mode && (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Work sx={{ fontSize: 18, color: COLORS.success.main }} />
                              <Typography variant="body2" color="text.secondary">
                                <strong>Work Model:</strong> {item.work_mode}
                              </Typography>
                            </Box>
                          )}
                          {(item.country || item.city) && (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <LocationOn sx={{ fontSize: 18, color: COLORS.secondary.main }} />
                              <Typography variant="body2" color="text.secondary">
                                {item.city ? `${item.city}, ${item.country}` : item.country}
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                      </CardContent>
                      <CardActions sx={{ px: 2, pb: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                        <Button
                          variant="contained"
                          fullWidth
                          startIcon={<Visibility />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(item);
                          }}
                          sx={{
                            background: `linear-gradient(135deg, ${COLORS.success.main} 0%, ${COLORS.success.dark} 100%)`,
                            "&:hover": {
                              background: `linear-gradient(135deg, ${COLORS.success.dark} 0%, ${COLORS.success.darker} 100%)`,
                              boxShadow: `0 4px 12px ${COLORS.success.main}50`,
                            },
                            textTransform: "none",
                            fontWeight: 600,
                          }}
                        >
                          View Details
                        </Button>
                        {/* Create Deal button for freelancers only */}
                        {role === "freelancer" && (() => {
                          const itemId = item.id || item.job_id || item.project_id;
                          const itemType = item.job_id ? "job" : item.project_id ? "project" : (item.type === "job" ? "job" : item.type === "project" || item.type === "projects" ? "project" : null);

                          // Freelancers can create deals from both jobs and projects
                          if (itemType !== "job" && itemType !== "project") {
                            return null;
                          }

                          return (
                            <Button
                              variant="contained"
                              fullWidth
                              startIcon={<AddIcon />}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (itemType === "job") {
                                  handleCreateDealFromJob(item);
                                } else if (itemType === "project") {
                                  handleCreateDealFromProject(item);
                                }
                              }}
                              disabled={!itemId}
                              sx={{
                                background: `linear-gradient(135deg, ${COLORS.accent.main} 0%, ${COLORS.accent.dark} 100%)`,
                                "&:hover": {
                                  background: `linear-gradient(135deg, ${COLORS.accent.dark} 0%, ${COLORS.accent.darker} 100%)`,
                                  boxShadow: `0 4px 12px ${COLORS.accent.main}50`,
                                },
                                textTransform: "none",
                                fontWeight: 600,
                              }}
                            >
                              Create Deal
                            </Button>
                          );
                        })()}
                      </CardActions>
                    </Card>
                  </Grid>
                )
              )}
          </Grid>

          {/* Available Projects to Pursue as Deals Section - Only for Company Admins */}
          {(role === "company" || role === "company_admin") && (
            <Box sx={{ mt: 4 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: COLORS.success.dark,
                  mb: 3,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <TrendingUp sx={{ color: COLORS.success.main }} />
                Available Projects to Pursue as Deals
              </Typography>
              {loadingAvailableProjects ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress sx={{ color: COLORS.success.main }} />
                </Box>
              ) : filteredAvailableProjects && filteredAvailableProjects.length > 0 ? (
                <Grid container spacing={2}>
                  {filteredAvailableProjects.slice(0, 6).map((project, index) => (
                    <Grid item xs={12} sm={6} md={4} key={project.project_id || project.id || index}>
                      <Card
                        sx={{
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          borderLeft: `4px solid ${COLORS.success.main}`,
                          boxShadow: `0 2px 8px ${COLORS.neutral.gray300}`,
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          "&:hover": {
                            transform: "translateY(-8px)",
                            boxShadow: `0 8px 24px ${COLORS.success.main}40`,
                            borderLeft: `4px solid ${COLORS.success.dark}`,
                          },
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                            <Avatar
                              sx={{
                                bgcolor: COLORS.success.main,
                                width: 56,
                                height: 56,
                                fontSize: "1.5rem",
                                fontWeight: 700,
                                mr: 2,
                                boxShadow: `0 4px 12px ${COLORS.success.main}50`,
                              }}
                            >
                              {getInitials(project.title || project.project_title || "P")}
                            </Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 700,
                                  color: COLORS.primary.dark,
                                  mb: 0.5,
                                }}
                              >
                                {project.title || project.project_title}
                              </Typography>
                              {project.company_name && (
                                <Typography variant="body2" color="text.secondary">
                                  {project.company_name}
                                </Typography>
                              )}
                              {(project.domain || project.preferred_domain) && (
                                <Chip
                                  label={project.domain || project.preferred_domain}
                                  size="small"
                                  sx={{
                                    bgcolor: `${COLORS.success.lightest}40`,
                                    color: COLORS.success.dark,
                                    fontWeight: 500,
                                    fontSize: "0.75rem",
                                    mt: 0.5,
                                  }}
                                />
                              )}
                            </Box>
                          </Box>

                          <Stack spacing={1}>
                            {project.experience_level && (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <AccessTime sx={{ fontSize: 18, color: COLORS.accent.main }} />
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Experience:</strong> {project.experience_level}
                                </Typography>
                              </Box>
                            )}
                            {project.work_mode && (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Work sx={{ fontSize: 18, color: COLORS.success.main }} />
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Work Model:</strong> {project.work_mode}
                                </Typography>
                              </Box>
                            )}
                            {(project.salary || project.salaryRange) && (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <TrendingUp sx={{ fontSize: 18, color: COLORS.accent.main }} />
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 600,
                                    color: COLORS.accent.dark,
                                  }}
                                >
                                  {project.salaryRange || (project.salary ? `$${project.salary.toLocaleString()}` : "")}
                                </Typography>
                              </Box>
                            )}
                            {(project.country || project.city) && (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <LocationOn sx={{ fontSize: 18, color: COLORS.secondary.main }} />
                                <Typography variant="body2" color="text.secondary">
                                  {project.city ? `${project.city}, ${project.country}` : project.country}
                                </Typography>
                              </Box>
                            )}
                          </Stack>
                        </CardContent>
                        <CardActions sx={{ px: 2, pb: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                          <Button
                            variant="contained"
                            fullWidth
                            startIcon={<TrendingUp />}
                            onClick={(e) => {
                              e.stopPropagation();
                              const projectId = project.project_id || project.id;
                              if (projectId) {
                                handlePursueAsDeal(projectId);
                              }
                            }}
                            sx={{
                              background: `linear-gradient(135deg, ${COLORS.success.main} 0%, ${COLORS.success.dark} 100%)`,
                              "&:hover": {
                                background: `linear-gradient(135deg, ${COLORS.success.dark} 0%, ${COLORS.success.darker} 100%)`,
                                boxShadow: `0 4px 12px ${COLORS.success.main}50`,
                              },
                              textTransform: "none",
                              fontWeight: 600,
                            }}
                          >
                            Pursue as Deal
                          </Button>
                          <Button
                            variant="outlined"
                            fullWidth
                            startIcon={<Visibility />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails({
                                ...project,
                                type: "project",
                                id: project.project_id || project.id,
                                title: project.title || project.project_title,
                              });
                            }}
                            sx={{
                              borderColor: COLORS.primary.main,
                              color: COLORS.primary.main,
                              "&:hover": {
                                borderColor: COLORS.primary.dark,
                                backgroundColor: `${COLORS.primary.lightest}20`,
                              },
                              textTransform: "none",
                              fontWeight: 600,
                            }}
                          >
                            View Details
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Paper
                  sx={{
                    p: 3,
                    textAlign: "center",
                    backgroundColor: COLORS.neutral.white,
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body1" color="text.secondary">
                    {loadingAvailableProjects === false
                      ? availableProjects && availableProjects.length > 0
                        ? `No projects match the current filters. ${availableProjects.length} project(s) available without filters.`
                        : "No available projects to pursue at the moment. Projects from other companies will appear here."
                      : "Loading available projects..."}
                  </Typography>
                  {process.env.NODE_ENV === "development" && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                      Debug: Role={role}, Token={token ? "present" : "missing"}, Total Projects={availableProjects?.length || 0}, Filtered={filteredAvailableProjects?.length || 0}
                    </Typography>
                  )}
                </Paper>
              )}
            </Box>
          )}
        </Grid>

        {/* Filter Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              position: "sticky",
              top: 20,
              backgroundColor: COLORS.neutral.white,
              borderLeft: `4px solid ${COLORS.primary.main}`,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: COLORS.primary.dark,
                mb: 3,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Star sx={{ color: COLORS.accent.main }} />
              Filters
            </Typography>

            <Stack spacing={2}>
              <TextField
                label="Top Matches"
                type="number"
                name="topK"
                value={filters.topK}
                onChange={handleFilterChange}
                inputProps={{ min: 1, max: filteredResults.length || 10 }}
                fullWidth
                size="small"
              />

              <TextField select label="Country" name="country" value={filters.country} onChange={handleFilterChange} fullWidth size="small">
                <MenuItem value="">Select Country</MenuItem>
                {Object.keys(COUNTRY_CITY).map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="City"
                name="city"
                value={filters.city}
                onChange={handleFilterChange}
                fullWidth
                size="small"
                disabled={!filters.country}
              >
                <MenuItem value="">Select City</MenuItem>
                {availableCities.map((city) => (
                  <MenuItem key={city} value={city}>
                    {city}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Salary Range"
                name="salaryRange"
                value={filters.salaryRange}
                onChange={handleFilterChange}
                fullWidth
                size="small"
              >
                <MenuItem value="">Any</MenuItem>
                {SALARY_RANGES.map((range) => (
                  <MenuItem key={range} value={range}>
                    {range}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Experience Level"
                name="experience"
                value={filters.experience}
                onChange={handleFilterChange}
                fullWidth
                size="small"
              >
                <MenuItem value="">Any</MenuItem>
                {EXPERIENCE_LEVELS.map((exp) => (
                  <MenuItem key={exp} value={exp}>
                    {exp}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label={role === "freelancer" ? "Project Type" : "Job Type"}
                name="jobType"
                value={filters.jobType}
                onChange={handleFilterChange}
                fullWidth
                size="small"
              >
                <MenuItem value="">Any</MenuItem>
                {role === "freelancer"
                  ? PROJECT_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))
                  : JOB_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
              </TextField>

              <TextField select label="Work Model" name="workModel" value={filters.workModel} onChange={handleFilterChange} fullWidth size="small">
                <MenuItem value="">Any</MenuItem>
                {WORK_MODES.map((mode) => (
                  <MenuItem key={mode} value={mode}>
                    {mode}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TalentMatch;
