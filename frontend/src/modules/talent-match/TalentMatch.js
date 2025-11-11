import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom"; // Add this import
import axios from "axios";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import "./TalentMatch.css";

const readJson = (key, fallback = []) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
};

const DOMAINS = [
  "Healthcare", "Information Technology", "Software", "SaaS", "Finance", "Education", "E-commerce", "Marketing",
  "Manufacturing", "Retail", "Hospitality", "Transportation", "Telecommunications", "Real Estate", "Energy",
  "Energy & Utilities", "Automotive", "Agriculture", "Pharmaceuticals", "Media", "Media & Entertainment",
  "Entertainment", "Government", "Non-profit", "Legal", "Other", "Research & Development", "Cloud Computing",
  "Software Development", "Data Science", "Automation", "Web Development", "Mobile Apps", "AI & ML", "AI", "Cybersecurity"
];

const SALARY_RANGES = ["Any", "0 - 500", "500 - 1,000", "1,000 - 2,000", "2,000 - 5,000", "5,000+"];
const EXPERIENCE_LEVELS = ["Any", "beginner", "intermediate", "expert"];
const JOB_TYPE = ["Any", "full-time", "part-time", "contract", "internship"];
const PROJECT_TYPES = ["Any", "short-term", "long-term", "General", "milestone"];
const WORK_MODES = ["Any", "remote", "hybrid", "on-site"];

const COUNTRY_CITY = {
  Pakistan: ["Karachi","Lahore","Islamabad","Rawalpindi","Peshawar","Quetta","Faisalabad","Multan","Sialkot","Gujranwala","Hyderabad"],
  USA: ["New York","San Francisco","Los Angeles","Chicago","Austin","Seattle","Boston","Denver","Miami","Houston","Philadelphia"],
  India: ["Mumbai","Delhi","Bengaluru","Hyderabad","Chennai","Pune","Kolkata","Ahmedabad","Jaipur","Lucknow"],
  UK: ["London","Manchester","Birmingham","Leeds","Glasgow","Liverpool","Bristol","Sheffield"],
  Canada: ["Toronto","Vancouver","Montreal","Calgary","Ottawa","Edmonton","Winnipeg"],
  Australia: ["Sydney","Melbourne","Brisbane","Perth","Adelaide","Canberra"],
  France: ["Paris","Marseille","Lyon","Toulouse","Nice","Nantes"],
  Germany: ["Berlin","Munich","Frankfurt","Hamburg","Cologne","Stuttgart"],
  Spain: ["Madrid","Barcelona","Valencia","Seville","Zaragoza","Malaga"],
  Italy: ["Rome","Milan","Naples","Turin","Bologna","Florence"],
  Netherlands: ["Amsterdam","Rotterdam","The Hague","Utrecht","Eindhoven"],
  Brazil: ["Sao Paulo","Rio de Janeiro","Brasilia","Salvador","Fortaleza"],
  Mexico: ["Mexico City","Guadalajara","Monterrey","Puebla","Tijuana"],
  Argentina: ["Buenos Aires","Cordoba","Rosario","Mendoza","La Plata"],
  SouthAfrica: ["Johannesburg","Cape Town","Durban","Pretoria","Port Elizabeth"],
  Nigeria: ["Lagos","Abuja","Ibadan","Kano","Port Harcourt"],
  Japan: ["Tokyo","Osaka","Yokohama","Nagoya","Sapporo"],
  China: ["Beijing","Shanghai","Shenzhen","Guangzhou","Chengdu"],
  SouthKorea: ["Seoul","Busan","Incheon","Daegu","Daejeon"],
  Indonesia: ["Jakarta","Surabaya","Bandung","Medan","Semarang"],
  Malaysia: ["Kuala Lumpur","George Town","Johor Bahru","Ipoh","Kota Kinabalu"],
  Thailand: ["Bangkok","Chiang Mai","Phuket","Pattaya","Hat Yai"],
  Vietnam: ["Hanoi","Ho Chi Minh City","Da Nang","Can Tho","Nha Trang"],
  UAE: ["Dubai","Abu Dhabi","Sharjah","Ajman","Al Ain"],
  SaudiArabia: ["Riyadh","Jeddah","Dammam","Medina","Mecca"],
  Turkey: ["Istanbul","Ankara","Izmir","Bursa","Antalya"],
  Egypt: ["Cairo","Alexandria","Giza","Shubra El-Kheima","Port Said"],
  Poland: ["Warsaw","Krakow","Lodz","Wroclaw","Poznan"],
  Ireland: ["Dublin","Cork","Limerick","Galway","Waterford"],
  Chile: ["Santiago","Valparaiso","Concepcion","Antofagasta","Temuco"],
  Colombia: ["Bogota","Medellin","Cali","Barranquilla","Cartagena"],
  Other: ["Other City"]
};


const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";

const TalentMatch = () => {
  const navigate = useNavigate(); // Add this hook

  const jobsLocal = readJson("jobs", []);
  const projectsLocal = readJson("projects", []);
  const candidatesLocal = readJson("candidates", []);

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

  const [jobs, setJobs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);

  const axiosInstance = axios.create({
    baseURL: API_BASE,
    headers: {
      "Content-Type": "application/json",
      ...(localStorage.getItem("authToken")
        ? { Authorization: `Bearer ${localStorage.getItem("authToken")}` }
        : {}),
    },
  });

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
          if (jobsRes.status === "fulfilled" && Array.isArray(jobsRes.value.data)) setJobs(jobsRes.value.data);
          // Removed localStorage fallbacks to avoid displaying hardcoded data

          if (projectsRes.status === "fulfilled" && Array.isArray(projectsRes.value.data)) setProjects(projectsRes.value.data);
          // Removed localStorage fallbacks to avoid displaying hardcoded data

          if (candidatesRes.status === "fulfilled" && Array.isArray(candidatesRes.value.data)) setCandidates(candidatesRes.value.data);
          // Removed localStorage fallbacks to avoid displaying hardcoded data
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
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: name === "topK" ? parseInt(value) : value,
      ...(name === "country" ? { city: "" } : {}),
    }));
  };

  const buildSearchPayload = () => {
    const payload = { top_k: filters.topK };
    if (filters.salaryRange && SALARY_RANGES.includes(filters.salaryRange)) payload.salary_range = filters.salaryRange;
    if (filters.experience && EXPERIENCE_LEVELS.includes(filters.experience)) payload.experience_level = filters.experience;
    if (filters.workModel && WORK_MODES.includes(filters.workModel)) payload.work_mode = filters.workModel;
    if (filters.country) payload.country = filters.country;
    if (filters.city) payload.city = filters.city;
    if (role === "freelancer" && filters.jobType && PROJECT_TYPES.includes(filters.jobType)) payload.project_type = filters.jobType;
    else if (role === "jobseeker" && filters.jobType && JOB_TYPE.includes(filters.jobType)) payload.job_type = filters.jobType;
    return payload;
  };

  const handleSearch = async () => {
    setLoading(true);
    setError("");
    if ((role === "company" || role === "company_admin") && !selectedPost) {
      setError("No job/project selected. Please select one from your dashboard.");
      setLoading(false);
      return;
    }
    const payload = buildSearchPayload();
    console.log("Payload being sent:", payload);  // Add this for debugging
    if (role === "company" || role === "company_admin") payload.post_id = selectedPost.id;
    try {
      const res = await axiosInstance.get("/talent-match", { params: payload });
      console.log("API Response:", res.data);  // Add this to see what the backend returns
      setSearchResults(res.data.matches || []);
    } catch {
      setError("Failed to fetch matches. Try again.");
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ((role === "company" || role === "company_admin") && !selectedPost) return;
    handleSearch();
  }, [filters, role, selectedPost]);

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
      <Sidebar />
      <div className="talentmatch-main">
        <Header />

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
              {SALARY_RANGES.slice(1).map((range) => (
                <option key={range} value={range}>{range}</option>
              ))}
            </select>

            <label>Experience Level</label>
            <select name="experience" onChange={handleFilterChange} value={filters.experience}>
              <option value="">Any</option>
              {EXPERIENCE_LEVELS.slice(1).map((exp) => (
                <option key={exp} value={exp}>{exp}</option>
              ))}
            </select>

            <label>Job Type</label>
            <select name="jobType" onChange={handleFilterChange} value={filters.jobType}>
              <option value="">Any</option>
              {role === "freelancer"
                ? PROJECT_TYPES.slice(1).map((type) => <option key={type} value={type}>{type}</option>)
                : JOB_TYPE.slice(1).map((type) => <option key={type} value={type}>{type}</option>)
              }
            </select>

            <label>Work Model</label>
            <select name="workModel" onChange={handleFilterChange} value={filters.workModel}>
              <option value="">Any</option>
              {WORK_MODES.slice(1).map((mode) => (
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
