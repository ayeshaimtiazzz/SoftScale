import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./styles.css";
import { API_BASE } from "config";
import { useAuth } from "../../contexts/AuthContext";
import {
  COUNTRY_CITY,
  SALARY_RANGES,
  EXPERIENCE_LEVELS,
  JOB_TYPES,
  PROJECT_TYPES,
  WORK_MODES,
} from "../../constants";

const readJson = (key, fallback = []) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
};

const TalentMatch = () => {
  const navigate = useNavigate();
  const { token } = useAuth();

  let role = "guest";
  try {
    const cu = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (cu && cu.role) role = cu.role;
    else if (cu && cu.email) {
      const email = cu.email;
      const companyProfiles = readJson("companyProfiles", []);
      const freelancerProfiles = readJson("freelancerProfiles", []);
      const jobSeekerProfiles = readJson("jobSeekerProfiles", []);
      if (companyProfiles.find(c => c.user_id === email || c.company_name === email)) role = "company";
      else if (freelancerProfiles.find(f => f.email === email)) role = "freelancer";
      else if (jobSeekerProfiles.find(j => j.email === email)) role = "jobseeker";
    }
  } catch {
    role = "guest";
  }

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

  const axiosInstance = useMemo(
    () =>
      axios.create({
        baseURL: API_BASE,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }),
    [token]
  );

  useEffect(() => {
    const post = JSON.parse(localStorage.getItem("selectedPost") || "null");
    if (post) {
      setSelectedPost(post);
      localStorage.removeItem("selectedPost");
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [jobsRes, projectsRes, candidatesRes] = await Promise.allSettled([
          axiosInstance.get("/api/jobs"),
          axiosInstance.get("/api/projects"),
          axiosInstance.get("/api/candidates"),
        ]);
        if (mounted) {
          if (jobsRes.status === "fulfilled" && Array.isArray(jobsRes.value.data)) {
            // Data available for future use
          }
          if (projectsRes.status === "fulfilled" && Array.isArray(projectsRes.value.data)) {
            // Data available for future use
          }
          if (candidatesRes.status === "fulfilled" && Array.isArray(candidatesRes.value.data)) {
            // Data available for future use
          }
        }
      } catch {
        // Removed localStorage fallbacks to avoid displaying hardcoded data
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
    setFilters((prev) => ({
      ...prev,
      [name]: name === "topK" ? parseInt(value) : value,
      ...(name === "country" ? { city: "" } : {}),
    }));
  };

  const buildSearchPayload = useCallback(() => {
    const payload = { top_k: filters.topK };
    if (filters.salaryRange && SALARY_RANGES.includes(filters.salaryRange)) payload.salary_range = filters.salaryRange;
    if (filters.experience && EXPERIENCE_LEVELS.includes(filters.experience)) payload.experience_level = filters.experience;
    if (filters.workModel && WORK_MODES.includes(filters.workModel)) payload.work_mode = filters.workModel;
    if (filters.country) payload.country = filters.country;
    if (filters.city) payload.city = filters.city;
    if (role === "freelancer" && filters.jobType && PROJECT_TYPES.includes(filters.jobType)) payload.project_type = filters.jobType;
    else if (role === "jobseeker" && filters.jobType && JOB_TYPES.includes(filters.jobType)) payload.job_type = filters.jobType;
    return payload;
  }, [filters, role]);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setError("");
    if ((role === "company" || role === "company_admin") && !selectedPost) {
      setError("No job/project selected. Please select one from your dashboard.");
      setLoading(false);
      return;
    }
    const payload = buildSearchPayload();
    if (role === "company" || role === "company_admin") payload.post_id = selectedPost.id;
    try {
      const res = await axiosInstance.get("/talent-match", { params: payload });
      setSearchResults(res.data.matches || []);
    } catch {
      setError("Failed to fetch matches. Try again.");
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [axiosInstance, role, selectedPost, buildSearchPayload]);

  useEffect(() => {
    if ((role === "company" || role === "company_admin") && !selectedPost) return;
    handleSearch();
  }, [filters, role, selectedPost, handleSearch]);

  const availableCities = useMemo(() => {
    if (!filters.country) return ["Select City"];
    return COUNTRY_CITY[filters.country] || [];
  }, [filters.country]);

  // Client-side filtering of searchResults
  const filteredResults = useMemo(() => {
    return searchResults.filter((item) => {
      if (role === "company" || role === "company_admin") {
        // Filtering for candidates
        const countryMatch = filters.country ? item.location && item.location.includes(filters.country) : true;
        const cityMatch = filters.city ? item.location && item.location.includes(filters.city) : true;
        const workModelMatch = (role === "freelancer" || role === "jobseeker") ? (filters.workModel ? item.workModel === filters.workModel : true) : true;  // Only apply for freelancers/jobseekers

        // Experience parsing (e.g., "3 years" -> 3, or direct level like "intermediate")
        const expYears = item.experience ? (isNaN(parseInt(item.experience)) ? 0 : parseInt(item.experience.split(' ')[0])) : 0;
        const experienceMatch = filters.experience
          ? (filters.experience === "beginner" && expYears <= 1) ||
            (filters.experience === "intermediate" && expYears >= 2 && expYears <= 4) ||
            (filters.experience === "expert" && expYears >= 5) ||
            (item.experience === filters.experience)
          : true;

        // Salary range (assumes item has salaryRange as string, e.g., "500 - 1,000")
        const salaryMatch = filters.salaryRange
          ? (() => {
              if (!item.salaryRange) return true;
              const [min, max] = filters.salaryRange.split(' - ').map(s => parseInt(s.replace(',', '').replace('+', '')));
              const itemSalary = parseInt(item.salaryRange.split(' - ')[0] || item.salaryRange);
              if (filters.salaryRange === "5,000+") return itemSalary >= 5000;
              return itemSalary >= min && (max ? itemSalary <= max : true);
            })()
          : true;

        return countryMatch && cityMatch && workModelMatch && experienceMatch && salaryMatch;
      } else {
        // Filtering for jobs/projects
        const countryMatch = filters.country ? item.country === filters.country : true;
        const cityMatch = filters.city ? item.city === filters.city : true;
        const workModelMatch = (role === "freelancer" || role === "jobseeker") ? (filters.workModel ? item.work_mode === filters.workModel : true) : true;  // Only apply for freelancers/jobseekers
        const experienceMatch = filters.experience ? item.experience_level === filters.experience : true;

        // Job/Project type
        const typeMatch = filters.jobType
          ? (role === "freelancer" ? item.project_type === filters.jobType : item.job_type === filters.jobType)
          : true;

        // Salary range (if present)
        const salaryMatch = filters.salaryRange
          ? (() => {
              if (!item.salaryRange) return true;
              const [min, max] = filters.salaryRange.split(' - ').map(s => parseInt(s.replace(',', '').replace('+', '')));
              const itemSalary = parseInt(item.salaryRange.split(' - ')[0] || item.salaryRange);
              if (filters.salaryRange === "5,000+") return itemSalary >= 5000;
              return itemSalary >= min && (max ? itemSalary <= max : true);
            })()
          : true;

        return countryMatch && cityMatch && workModelMatch && experienceMatch && typeMatch && salaryMatch;
      }
    });
  }, [searchResults, filters, role]);

  // Handler for navigating to profile page
  const handleViewDetails = (item) => {
    navigate('/profile', { state: { item, role } }); // Pass the item and role in state
  };

  return (
    <div className="talentmatch-container">
      <div className="talentmatch-main">
        <div className="talentmatch-title">
          <h2>{(role === "company" || role === "company_admin") ? "Top Candidates" : "Top Jobs & Projects"}</h2>
        </div>

        <div className="talentmatch-flex">
          {/* Candidate or Job/Project Grid */}
          <div className="candidates-grid">
            {loading && <p>Loading...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}
            {!loading && !error && filteredResults.length === 0 && <p>Sorry, no matches found.</p>}

            {!loading && !error &&
              filteredResults.slice(0, filters.topK).map((item, index) =>
                (role === "company" || role === "company_admin") ? (
                  <div key={index} className="candidate-card">
                    <div className="candidate-avatar">{item.name ? item.name[0] : "U"}</div>
                    <div className="candidate-details">
                      <p className="candidate-name">{item.name}</p>
                      <p><b>Domain:</b> {item.domain}</p>
                      <p><b>Skills:</b> {item.skills}</p>
                      <p><b>Experience:</b> {item.experience}</p>
                      <p><b>Work Model:</b> {item.workModel || "N/A"}</p>
                      <p><b>Location:</b> {item.location}</p>
                      <button className="btn-primary" onClick={() => handleViewDetails(item)}>View Profile</button>
                    </div>
                  </div>
                ) : (
                  <div key={index} className="candidate-card">
                    <div className="candidate-avatar">{item.title ? item.title[0] : (item.name ? item.name[0] : "J")}</div>
                    <div className="candidate-details">
                      <p className="candidate-name">{item.title || item.name}</p>
                      <p><b>Company:</b> {item.company_name}</p>
                      <p><b>Domain:</b> {item.preferred_domain || item.domain}</p>
                      <p><b>Experience:</b> {item.experience_level}</p>
                      <p><b>Work Model:</b> {item.work_mode}</p>
                      <p><b>Location:</b> {item.country}, {item.city}</p>
                      <button className="btn-primary" onClick={() => handleViewDetails(item)}>View Details</button>
                    </div>
                  </div>
                )
              )}
          </div>

          {/* Filter Sidebar */}
          <div className="filter-sidebar">
            <h3>Filters</h3>

            <label>Top Matches</label>
            <input
              type="number"
              name="topK"
              min="1"
              max={filteredResults.length || 10}
              value={filters.topK}
              onChange={handleFilterChange}
            />

            <label>Country</label>
            <select name="country" onChange={handleFilterChange} value={filters.country}>
              <option value="">Select Country</option>
              {Object.keys(COUNTRY_CITY).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <label>City</label>
            <select name="city" onChange={handleFilterChange} value={filters.city}>
              <option value="">Select City</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>

            <label>Salary Range</label>
            <select name="salaryRange" onChange={handleFilterChange} value={filters.salaryRange}>
              <option value="">Any</option>
              {SALARY_RANGES.map((range) => (
                <option key={range} value={range}>{range}</option>
              ))}
            </select>

            <label>Experience Level</label>
            <select name="experience" onChange={handleFilterChange} value={filters.experience}>
              <option value="">Any</option>
              {EXPERIENCE_LEVELS.map((exp) => (
                <option key={exp} value={exp}>{exp}</option>
              ))}
            </select>

            <label>Job Type</label>
            <select name="jobType" onChange={handleFilterChange} value={filters.jobType}>
              <option value="">Any</option>
              {role === "freelancer"
                ? PROJECT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)
                : JOB_TYPES.map((type) => <option key={type} value={type}>{type}</option>)
              }
            </select>

            <label>Work Model</label>
            <select name="workModel" onChange={handleFilterChange} value={filters.workModel}>
              <option value="">Any</option>
              {WORK_MODES.map((mode) => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>

          </div>
        </div>
      </div>
    </div>
  );
};

export default TalentMatch;
