import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { LocationOn, Work, School, AccessTime, Visibility, Star, TrendingUp, SearchOutlined } from "@mui/icons-material";
import "./styles.css";
import { API_BASE } from "config";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../providers/ToastProvider";
import PageTitle from "../../components/common/PageTitle";
import { useTranslation } from "react-i18next";
import { COLORS, COUNTRY_CITY, SALARY_RANGES, EXPERIENCE_LEVELS, JOB_TYPES, PROJECT_TYPES, WORK_MODES } from "../../constants";

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
  const { showToast } = useToast();
  const { t } = useTranslation();

  let role = "guest";
  try {
    const cu = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (cu && cu.role) role = cu.role;
    else if (cu && cu.email) {
      const email = cu.email;
      const companyProfiles = readJson("companyProfiles", []);
      const freelancerProfiles = readJson("freelancerProfiles", []);
      const jobSeekerProfiles = readJson("jobSeekerProfiles", []);
      if (companyProfiles.find((c) => c.user_id === email || c.company_name === email)) role = "company";
      else if (freelancerProfiles.find((f) => f.email === email)) role = "freelancer";
      else if (jobSeekerProfiles.find((j) => j.email === email)) role = "jobseeker";
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
                      <CardActions sx={{ px: 2, pb: 2 }}>
                        <Button
                          variant="contained"
                          fullWidth
                          startIcon={<Visibility />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(item);
                          }}
                          sx={{
                            background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.dark} 100%)`,
                            "&:hover": {
                              background: `linear-gradient(135deg, ${COLORS.primary.dark} 0%, ${COLORS.primary.darker} 100%)`,
                              boxShadow: `0 4px 12px ${COLORS.primary.main}50`,
                            },
                            textTransform: "none",
                            fontWeight: 600,
                          }}
                        >
                          View Profile
                        </Button>
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
                      <CardActions sx={{ px: 2, pb: 2 }}>
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
                      </CardActions>
                    </Card>
                  </Grid>
                )
              )}
          </Grid>
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
