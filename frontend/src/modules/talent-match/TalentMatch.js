import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import "./TalentMatch.css";

const readJson = (key, fallback = []) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch (e) {
    return fallback;
  }
};

/* -------------------------
   Constants (unchanged UI lists)
   ------------------------- */
const DOMAINS = [
  "Healthcare","Information Technology","Software","SaaS","Finance","Education","E-commerce","Marketing",
  "Manufacturing","Retail","Hospitality","Transportation","Telecommunications","Real Estate","Energy",
  "Energy & Utilities","Automotive","Agriculture","Pharmaceuticals","Media","Media & Entertainment",
  "Entertainment","Government","Non-profit","Legal","Other","Research & Development","Cloud Computing",
  "Software Development","Data Science","Automation","Web Development","Mobile Apps","AI & ML","AI","Cybersecurity"
];

const SALARY_RANGES = ["Any","0 - 500","500 - 1,000","1,000 - 2,000","2,000 - 5,000","5,000+"];
const EXPERIENCE_LEVELS = ["beginner","intermediate","expert"];
const JOB_TYPE = ["full-time", "part-time", "contract","internship"];
const PROJECT_TYPES = ["short-term", "long-term", "General","milestone"];
const WORK_MODES = ["remote", "hybrid", "on-site"];

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

/* -------------------------
   The component
   ------------------------- */
function TalentMatch() {
  // local-store data fallback
  const jobsLocal = readJson("jobs", []);
  const projectsLocal = readJson("projects", []);
  const candidatesLocal = readJson("candidates", []);

  // determine role as before
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
  } catch (e) {
    role = "guest";
  }

  // filters (updated for collapsible UI and added missing ones)
  const [showFilters, setShowFilters] = useState(false);  // Toggle for filter visibility
  const [selectedCountries, setSelectedCountries] = useState([]);  // Array for multiple country selection
  const [cityFilter, setCityFilter] = useState("Any");
  const [salaryFilter, setSalaryFilter] = useState("Any");
  const [experienceFilter, setExperienceFilter] = useState("Any");
  const [jobTypeFilter, setJobTypeFilter] = useState("Any");
  const [workModeFilter, setWorkModeFilter] = useState("Any");
  // Added missing filters for company view
  const [nameFilter, setNameFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState("Any");
  const [scoreFilter, setScoreFilter] = useState("All Scores");

  // remote data
  const [jobs, setJobs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [searchResults, setSearchResults] = useState([]);

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const COUNTRIES = Object.keys(COUNTRY_CITY);

  // prepare axios instance with auth header if available
  const axiosInstance = axios.create({
    baseURL: API_BASE,
    headers: {
      "Content-Type": "application/json",
      ...(localStorage.getItem("authToken")
        ? { Authorization: `Bearer ${localStorage.getItem("authToken")}` }
        : {}),
    },
  });

    // Load selected post from localStorage (for companies)
  const [selectedPost, setSelectedPost] = useState(null);
  useEffect(() => {
    const post = JSON.parse(localStorage.getItem("selectedPost") || "null");
    if (post) {
      setSelectedPost(post);
      localStorage.removeItem("selectedPost");  // Clear after use
    }
  }, []);

  useEffect(() => {
    // initial load: try backend endpoints, if fail fallback to local
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
          else setJobs(jobsLocal);

          if (projectsRes.status === "fulfilled" && Array.isArray(projectsRes.value.data)) setProjects(projectsRes.value.data);
          else setProjects(projectsLocal);

          if (candidatesRes.status === "fulfilled" && Array.isArray(candidatesRes.value.data)) setCandidates(candidatesRes.value.data);
          else setCandidates(candidatesLocal);
        }
      } catch (err) {
        // fallback
        if (mounted) {
          setJobs(jobsLocal);
          setProjects(projectsLocal);
          setCandidates(candidatesLocal);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchAll();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

    // Handle country checkbox changes
  const handleCountryChange = (country, checked) => {
    if (checked) {
      setSelectedCountries([...selectedCountries, country]);
    } else {
      setSelectedCountries(selectedCountries.filter(c => c !== country));
    }
    setCityFilter("Any");  // Reset city when countries change
  };

  // Get available cities based on selected countries
  const availableCities = useMemo(() => {
    if (selectedCountries.length === 0) return ["Any"];
    const cities = selectedCountries.flatMap(country => COUNTRY_CITY[country] || []);
    return ["Any", ...new Set(cities)];  // Remove duplicates
  }, [selectedCountries]);

  // Build payload with selected filters
  const buildSearchPayload = () => {
    const payload = {
      top_k: 10,
      country: selectedCountries.length > 0 ? selectedCountries.join(",") : undefined,  // Fixed syntax error
      city: cityFilter !== "Any" ? cityFilter : undefined,
      salary_min: salaryFilter !== "Any" ? parseInt(salaryFilter.split(" - ")[0]) : undefined,
      salary_max: salaryFilter !== "Any" ? parseInt(salaryFilter.split(" - ")[1] || salaryFilter.replace("+", "")) : undefined,
      experience_level: experienceFilter !== "Any" ? experienceFilter : undefined,
      type: jobTypeFilter !== "Any" ? jobTypeFilter : undefined,
      work_mode: workModeFilter !== "Any" ? workModeFilter : undefined,
    };
    return payload;
  };

  // Call backend match endpoints with filters
  const handleSearchJobsProjects = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setError("");

    if (!selectedPost && role === "company") {
      setError("No job/project selected. Please select one from your dashboard.");
      setLoading(false);
      return;
    }

    const payload = buildSearchPayload();
    try {
      let res;
      if (role === "company") {
        res = await axiosInstance.get("/match-candidates", { params: { job_id: selectedPost?.id, project_id: selectedPost?.type === "project" ? selectedPost.id : undefined, ...payload } });
      } else {
        const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
        res = await axiosInstance.get("/match-jobs-projects", { params: { user_id: currentUser.user_id, ...payload } });
      }
      setSearchResults(res.data.matches || []);
    } catch (err) {
      setError("Failed to fetch matches. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // Filtered candidates for company view (unchanged)
  const filteredCandidates = useMemo(() => {
    const pool = (candidates && candidates.length > 0) ? candidates : readJson("candidates", []);
    const qName = nameFilter.trim().toLowerCase();
    return pool.filter((c) => {
      if (qName && !c.name.toLowerCase().includes(qName)) return false;
      if (selectedCountries.length > 0 && !selectedCountries.some(country => c.country?.toLowerCase().includes(country.toLowerCase()))) return false;
      if (cityFilter !== "Any" && (!c.city || c.city.toLowerCase() !== cityFilter.toLowerCase())) return false;
      if (experienceFilter !== "Any" && (!c.experience || !c.experience.toLowerCase().includes(experienceFilter))) return false;
      return true;
    });
  }, [candidates, nameFilter, selectedCountries, cityFilter, experienceFilter]);


  return (
    <div className="talentmatch-container">
      <Sidebar />
      <div className="talentmatch-main">
        <Header />

        <div className="talentmatch-content">
          <div className="talentmatch-header-section">
            <div className="talentmatch-title">
              <h1>{role === "company" ? "Candidates" : "Jobs & Projects"}</h1>
              <p>
                {role === "company"
                  ? "Manage and review AI-matched candidates"
                  : "Search jobs and projects matched to your filters"}
              </p>
            </div>
          </div>

          <div className="talentmatch-top-row">
            <div className="talentmatch-filters-container" style={{ minWidth: 320 }}>
              {role === "company" ? (
                // Company view: Keep original filters (always visible, as per your original code)
                <>
                  <input
                    type="text"
                    placeholder="Candidate name (company admin)"
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    className="search-input"
                  />

                  <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="status-dropdown">
                    <option value="Any">Country (optional)</option>
                    {["Any", ...COUNTRIES].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="status-dropdown">
                    <option value="Any">City (optional)</option>
                    {countryFilter && countryFilter !== "Any"
                      ? (COUNTRY_CITY[countryFilter] || ["Other City"]).map((ct) => (<option key={ct} value={ct}>{ct}</option>))
                      : Object.values(COUNTRY_CITY).flat().map((ct) => (<option key={ct} value={ct}>{ct}</option>))
                    }
                  </select>

                  <select value={experienceFilter} onChange={(e) => setExperienceFilter(e.target.value)} className="status-dropdown">
                    {EXPERIENCE_LEVELS.map((ex) => <option key={ex} value={ex}>{ex}</option>)}
                  </select>

                  <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} className="status-dropdown">
                    <option value="Any">Domain (optional)</option>
                    {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </>
              ) : (
                // Freelancers/Job Seekers: Collapsible filters to save space
                <>
                  <button className="btn-secondary" onClick={() => setShowFilters(!showFilters)} style={{ marginBottom: 10 }}>
                    {showFilters ? "Hide Filters" : "Apply Filters"}
                  </button>

                  {showFilters && (
                    <div style={{ border: "1px solid #e6e9ef", padding: 12, borderRadius: 8, background: "#f9f9f9" }}>
                      {/* Country (Checkboxes for multiple selection) */}
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontWeight: "bold" }}>Country (Select multiple):</label>
                        <div style={{ maxHeight: 100, overflowY: "auto" }}>
                          {COUNTRIES.map((country) => (
                            <label key={country} style={{ display: "block", margin: "4px 0" }}>
                              <input
                                type="checkbox"
                                checked={selectedCountries.includes(country)}
                                onChange={(e) => handleCountryChange(country, e.target.checked)}
                              />
                              {country}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* City */}
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontWeight: "bold" }}>City:</label>
                        <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="status-dropdown">
                          {availableCities.map((city) => <option key={city} value={city}>{city}</option>)}
                        </select>
                      </div>

                      {/* Salary Range */}
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontWeight: "bold" }}>Salary Range:</label>
                        <select value={salaryFilter} onChange={(e) => setSalaryFilter(e.target.value)} className="status-dropdown">
                          {SALARY_RANGES.map((range) => <option key={range} value={range}>{range}</option>)}
                        </select>
                      </div>

                      {/* Experience Level */}
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontWeight: "bold" }}>Experience Level:</label>
                        <select value={experienceFilter} onChange={(e) => setExperienceFilter(e.target.value)} className="status-dropdown">
                          {EXPERIENCE_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
                        </select>
                      </div>

                      {/* Job/Project Type */}
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontWeight: "bold" }}>Job/Project Type:</label>
                        <select value={jobTypeFilter} onChange={(e) => setJobTypeFilter(e.target.value)} className="status-dropdown">
                          {JOB_TYPE.map((type) => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </div>

                      {/* Work Mode */}
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontWeight: "bold" }}>Work Mode:</label>
                        <select value={workModeFilter} onChange={(e) => setWorkModeFilter(e.target.value)} className="status-dropdown">
                          {WORK_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Search Button */}
                  <button className="add-candidate-btn" style={{ marginLeft: 12 }} onClick={handleSearchJobsProjects}>
                    Search
                  </button>
                </>
              )}
            </div>

            {role === "company" ? (
              <div className="mini-profile-container">
                <div className="mini-profile-header">
                  <div className="mini-profile-avatar">JW</div>
                  <div>
                    <p className="mini-profile-name">James Wilson</p>
                    <p className="mini-profile-experience">5 years Experience</p>
                  </div>
                </div>

                <div className="mini-profile-details">
                  <p><strong>AI Match:</strong> 82%</p>
                  <p><strong>Email:</strong> j.wilson@email.com</p>
                  <p><strong>Phone:</strong> +1 (555) 123-4567</p>
                  <p><strong>Location:</strong> Chicago, IL</p>
                  <p><strong>AI Summary:</strong> Strong technical background with 5 years of experience in Java, Spring, Microservices.</p>
                  <p><strong>Key Skills:</strong> Java, Spring, Microservices</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="talentmatch-filters-second">
            {role === "company" ? (
              <>
                <select className="score-dropdown" value={scoreFilter} onChange={(e) => setScoreFilter(e.target.value)}>
                  <option>All Scores</option>
                  <option>90%+ Match</option>
                  <option>80%+ Match</option>
                  <option>70%+ Match</option>
                </select>

                <select className="more-filters-dropdown" value={workModeFilter} onChange={(e) => setWorkModeFilter(e.target.value)}>
                  <option>All Locations / Work Types</option>
                  {WORK_MODES.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </>
            ) : (
              <select className="score-dropdown" value={workModeFilter} onChange={(e) => setWorkModeFilter(e.target.value)}>
                <option>All Locations / Work Types</option>
                {WORK_MODES.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            )}
          </div>

          <div className="candidates-list">
            {role === "company" ? (
              filteredCandidates.length === 0 ? (
                <p style={{ color: "#666", textAlign: "center", marginTop: "20px" }}>No candidates to display</p>
              ) : (
                filteredCandidates.map((candidate) => (
                  <div className="candidate-card" key={candidate.id}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div className="candidate-placeholder">{candidate.name.split(" ").map((p) => p[0]).join("").slice(0,2)}</div>
                      <div style={{ minWidth: 260 }}>
                        <p className="candidate-name">{candidate.name}</p>
                        <p className="candidate-skills">{candidate.skills}</p>
                        <p className="small-muted" style={{ marginTop: 6 }}>{candidate.location} • {candidate.experience}</p>
                      </div>
                    </div>

                    <div className="candidate-match">
                      <p className="match-percent">{candidate.match}% Match</p>
                      <div style={{ marginTop: 8 }}>
                        <button
                          className="btn-primary"
                          onClick={() => alert(`Open candidate details for ${candidate.name} (stub).`)}
                          style={{ background: "#fff", color: "#333", border: "1px solid #e6e9ef" }}
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : (
              <>
                {loading && <p>Loading results...</p>}
                {error && <p style={{ color: "red" }}>{error}</p>}
                {searchResults.length > 0 ? (
                  <>
                    <h3 style={{ marginTop: 6 }}>Search results</h3>
                    <div className="list-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
                      {searchResults.map((r) => (
                        <div key={r.id || r.title} className="dashboard-item-card" style={{ padding: 12 }}>
                          <strong>{r.title}</strong>
                          <p className="muted">{(r.description || "").slice(0, 120)}...</p>
                          <p className="small-muted">{r.domain}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h3 style={{ marginTop: 6 }}>Top 5 jobs & projects</h3>
                    <div className="list-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
                      { (jobs.length + projects.length === 0 && (jobsLocal.length + projectsLocal.length === 0)) ? (
                        <p style={{ color: "#666" }}>No jobs or projects available yet.</p>
                      ) : (
                        randomTopJobsProjects().map((item) => (
                          <div key={item.id} className="dashboard-item-card" style={{ padding: 12 }}>
                            <strong>{item.title}</strong>
                            <p className="muted">{(item.description || "").slice(0, 120)}...</p>
                            <p className="small-muted">{item.domain}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* small helper to return top jobs/projects */
function randomTopJobsProjects() {
  const jobs = readJson("jobs", []);
  const projects = readJson("projects", []);
  const pool = [...jobs, ...projects].map((it) => ({
    title: it.job_title || it.project_title || "Untitled",
    description: it.job_description || it.project_description || "",
    domain: it.preferred_domain || it.domain || "General",
    id: it.id || Date.now() + Math.random(),
  }));
  const shuffled = pool.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 5);
}

export default TalentMatch;