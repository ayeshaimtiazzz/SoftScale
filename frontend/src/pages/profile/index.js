import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { Box, Container, Card, CardContent, Typography, Grid, Chip, Stack, Divider, Avatar, Paper } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import WorkIcon from "@mui/icons-material/Work";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import AssignmentIcon from "@mui/icons-material/Assignment";
import BusinessIcon from "@mui/icons-material/Business";
import DescriptionIcon from "@mui/icons-material/Description";
import { LocationOn, AttachMoney, AccessTime, School, Email, Phone, Language, CalendarToday, CheckCircle, TrendingUp } from "@mui/icons-material";
import "./styles.css";
import { API_BASE } from "config";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../contexts/AuthContext";
import { STORAGE_KEYS, COLORS } from "../../constants";

const Profile = () => {
  const location = useLocation();
  const { showToast } = useToast();
  const { user, token } = useAuth();
  const { item, role: stateRole } = location.state || {}; // Correctly destructure item and role
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Determine id and type from item and role, or fallback to current user
  let id = item?.id;
  let type = "";
  let role = stateRole || user?.role;
  // Normalize role name for backend compatibility (jobseeker -> job_seeker)
  if (role === "jobseeker") {
    role = "job_seeker";
  }
  const needsProfileIdFetch = !id && user; // Flag to indicate we need to fetch profile ID

  // If no item provided, try to use current user's profile
  if (needsProfileIdFetch) {
    // Determine type based on user role - show their own profile
    if (role === "company" || role === "company_admin") {
      type = "company"; // Company admins view their own company profile
    } else if (role === "freelancer") {
      type = "freelancer";
    } else if (role === "jobseeker" || role === "job_seeker") {
      type = "candidate"; // jobseeker is stored as candidate in the API
    }
  } else if (item) {
    // Use provided item and role - this is for viewing other profiles
    if (item.type === "candidate" || item.type === "job_seeker") {
      type = "candidate";
    } else if (item.type === "freelancer") {
      type = "freelancer";
    } else if (item.type === "company") {
      type = "company";
    } else if (item.type === "job") {
      type = "job";
    } else if (item.type === "project") {
      type = "project";
    } else {
      // Fallback: determine from role
      if (role === "company" || role === "company_admin") {
        type = "candidate"; // Companies viewing candidate profiles
      } else if (role === "freelancer") {
        type = item?.title ? "project" : "job";
      } else if (role === "jobseeker" || role === "job_seeker") {
        type = "job";
      }
    }
  }

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user && !item) {
        setError("Please log in to view your profile.");
        setLoading(false);
        return;
      }

      // Get auth token - ensure it's a string, not null/undefined
      let authToken = token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      // Clean up token if it has quotes or extra whitespace
      if (authToken && typeof authToken === "string") {
        authToken = authToken.trim().replace(/^["']|["']$/g, "");
      }

      let profileId = id;
      let profileType = type;

      // Check if we need to fetch profile ID (when viewing own profile without item)
      const userId = user?.user_id || user?.id;
      const shouldFetchProfileId = !id && user && !item && userId;

      if (shouldFetchProfileId) {
        // Validate token exists and is not empty
        if (!authToken || authToken === "null" || authToken === "undefined") {
          setError("Authentication required. Please log in again.");
          showToast("Authentication required. Please log in again.", "error");
          setLoading(false);
          return;
        }

        try {
          // Use old route for job_seeker, new route for company_admin and freelancer
          if (role === "jobseeker" || role === "job_seeker") {
            // Old route for job seeker - direct endpoint
            const response = await axios.get(`${API_BASE}/api/get-job-seeker-profile-id`, {
              headers: {
                Authorization: `Bearer ${authToken}`,
                "Content-Type": "application/json",
              },
            });

            if (!response.data || !response.data.profile_id) {
              throw new Error("Profile ID not found in response");
            }

            profileId = response.data.profile_id;
            profileType = "candidate";
          } else {
            // New route for company_admin and freelancer
            let roleParam = role;
            if (role === "company_admin") {
              roleParam = "company";
            }

            const response = await axios.get(`${API_BASE}/api/get-profile-id`, {
              params: { role: roleParam },
              headers: {
                Authorization: `Bearer ${authToken}`,
                "Content-Type": "application/json",
              },
            });

            if (!response.data || !response.data.profile_id) {
              throw new Error("Profile ID not found in response");
            }

            profileId = response.data.profile_id;

            // Set the correct profile type
            if (role === "company" || role === "company_admin") {
              profileType = "company";
            } else if (role === "freelancer") {
              profileType = "freelancer";
            }
          }
        } catch (err) {
          let errorMsg = "Profile not found. Please complete your profile setup.";

          if (err.response) {
            // Server responded with error
            if (err.response.status === 401) {
              errorMsg = "Authentication failed. Please log in again.";
            } else if (err.response.status === 404) {
              errorMsg = err.response.data?.detail || "Profile not found. Please complete your profile setup.";
            } else {
              errorMsg = err.response.data?.detail || err.message || errorMsg;
            }
          } else if (err.request) {
            // Request made but no response
            errorMsg = "Network error. Please check your connection.";
          } else {
            // Error setting up request
            errorMsg = err.message || errorMsg;
          }

          setError(errorMsg);
          showToast(errorMsg, "error");
          setLoading(false);
          return;
        }
      }

      if (!profileId || !profileType) {
        setError("No profile found. Please complete your profile setup or navigate to a profile from a list.");
        setLoading(false);
        return;
      }

      try {
        // Build headers - only include Authorization if token exists
        const headers = {
          "Content-Type": "application/json",
        };
        if (authToken) {
          headers.Authorization = `Bearer ${authToken}`;
        }

        const response = await axios.get(`${API_BASE}/api/profile/${profileId}?type=${profileType}`, {
          headers,
        });

        // Handle API response structure: {type: type, data: record}
        const data = response.data.data || response.data;

        if (!data) {
          throw new Error("No profile data received from server");
        }

        setProfileData(data);
        showToast("Profile loaded successfully!", "success");
      } catch (err) {
        const errorMsg = err.response?.data?.detail || err.message || "Failed to load profile.";
        showToast(errorMsg, "error");
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id, item?.id, role, token, id, type]);

  // Format field value for display
  const formatValue = (value) => {
    if (value === null || value === undefined || value === "") return "N/A";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) {
      if (value.length === 0) return "None";
      return value.join(", ");
    }
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  // Get profile name/title based on type and data
  const getProfileName = () => {
    if (!profileData) return null;

    switch (type) {
      case "candidate":
        return profileData.full_name || profileData.name || "Job Seeker";
      case "freelancer":
        return profileData.full_name || profileData.name || "Freelancer";
      case "company":
        return profileData.company_name || profileData.name || "Company";
      case "job":
        return profileData.job_title || "Job Opportunity";
      case "project":
        return profileData.project_title || "Project";
      default:
        return profileData.name || profileData.full_name || profileData.company_name || "Profile";
    }
  };

  // Get profile subtitle/role based on type and data
  const getProfileSubtitle = () => {
    if (!profileData) return null;

    switch (type) {
      case "candidate": {
        const jobType = profileData.job_type ? ` • ${profileData.job_type}` : "";
        const domain = profileData.domain ? ` • ${profileData.domain}` : "";
        const expLevel = profileData.experience_level ? ` • ${profileData.experience_level}` : "";
        return `Job Seeker${jobType}${domain}${expLevel}`;
      }
      case "freelancer": {
        const workPref = profileData.work_preference ? ` • ${profileData.work_preference}` : "";
        const freelancerDomain = profileData.domain ? ` • ${profileData.domain}` : "";
        const rate = profileData.hourly_rate ? ` • $${profileData.hourly_rate}/hr` : "";
        return `Freelancer${workPref}${freelancerDomain}${rate}`;
      }
      case "company": {
        const companySize = profileData.company_size ? ` • ${profileData.company_size}` : "";
        const companyDomain = profileData.domain ? ` • ${profileData.domain}` : "";
        const location =
          profileData.city && profileData.country
            ? ` • ${profileData.city}, ${profileData.country}`
            : profileData.city
              ? ` • ${profileData.city}`
              : profileData.country
                ? ` • ${profileData.country}`
                : "";
        return `Company${companySize}${companyDomain}${location}`;
      }
      case "job": {
        const jobDomain = profileData.preferred_domain ? ` • ${profileData.preferred_domain}` : "";
        const jobMode = profileData.work_mode ? ` • ${profileData.work_mode}` : "";
        const salary = profileData.salary ? ` • $${profileData.salary}` : "";
        return `Job Posting${jobDomain}${jobMode}${salary}`;
      }
      case "project": {
        const projType = profileData.project_type ? ` • ${profileData.project_type}` : "";
        const projDomain = profileData.domain ? ` • ${profileData.domain}` : "";
        const projPayment = profileData.payment_type ? ` • ${profileData.payment_type}` : "";
        return `Project${projType}${projDomain}${projPayment}`;
      }
      default:
        return role ? role.charAt(0).toUpperCase() + role.slice(1) : "Profile";
    }
  };

  // Get title icon based on type
  const getTitleIcon = () => {
    switch (type) {
      case "candidate":
        return <PersonIcon sx={{ fontSize: "2rem", mr: 1, verticalAlign: "middle" }} />;
      case "job":
        return <WorkIcon sx={{ fontSize: "2rem", mr: 1, verticalAlign: "middle" }} />;
      case "project":
        return <RocketLaunchIcon sx={{ fontSize: "2rem", mr: 1, verticalAlign: "middle" }} />;
      case "freelancer":
        return <AssignmentIcon sx={{ fontSize: "2rem", mr: 1, verticalAlign: "middle" }} />;
      case "company":
        return <BusinessIcon sx={{ fontSize: "2rem", mr: 1, verticalAlign: "middle" }} />;
      default:
        return <DescriptionIcon sx={{ fontSize: "2rem", mr: 1, verticalAlign: "middle" }} />;
    }
  };

  // Determine title text based on type
  const getTitleText = () => {
    switch (type) {
      case "candidate":
        return "Job Seeker Profile";
      case "job":
        return "Job Opportunity";
      case "project":
        return "Project Details";
      case "freelancer":
        return "Freelancer Profile";
      case "company":
        return "Company Profile";
      default:
        return "Profile Details";
    }
  };

  // Get theme color based on profile type
  const getProfileTypeColor = () => {
    switch (type) {
      case "candidate":
        return COLORS.info; // Blue for job seekers
      case "freelancer":
        return COLORS.accent; // Yellow for freelancers
      case "company":
        return COLORS.primary; // Slate for companies
      case "job":
        return COLORS.success; // Green for jobs
      case "project":
        return COLORS.secondary; // Red for projects
      default:
        return COLORS.primary; // Slate for default
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  // Get color based on field index for variety
  const getFieldColor = (index) => {
    const colors = [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.success, COLORS.info];
    return colors[index % colors.length];
  };

  // Enhanced render function with theme colors
  const renderProfileSectionWithColors = (data, fieldIndex = 0) => {
    if (!data || typeof data !== "object") return null;

    // Determine important fields based on profile type
    let importantFields = ["name", "email", "phone", "location", "domain", "skills", "experience", "education"];
    if (type === "company") {
      importantFields = ["company_name", "company_description", "domain", "company_size", "country", "city"];
    } else if (type === "freelancer") {
      importantFields = ["full_name", "email", "phone_number", "domain", "skills", "professional_summary", "hourly_rate", "experience_level"];
    } else if (type === "candidate") {
      importantFields = ["full_name", "email", "phone_number", "domain", "skills", "career_objective", "experience_level", "education"];
    }

    const regularFields = Object.keys(data).filter((key) => !importantFields.includes(key) && key !== "company_info");

    return (
      <>
        {/* Important fields first */}
        {importantFields.map((key, idx) => {
          if (!(key in data)) return null;
          const value = data[key];
          const formattedKey = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
          const color = getFieldColor(fieldIndex + idx);

          if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            return (
              <div key={key} className="profile-subsection" style={{ borderLeftColor: color.main }}>
                <h4 className="profile-subsection-title" style={{ color: color.main, borderBottomColor: color.lightest }}>
                  {formattedKey}
                </h4>
                <div className="profile-nested">{renderProfileSectionWithColors(value, fieldIndex + idx + 1)}</div>
              </div>
            );
          }

          return (
            <div
              key={key}
              className="profile-field profile-field-important"
              style={{
                borderLeftColor: color.main,
                background: `linear-gradient(135deg, ${color.lightest}20 0%, ${color.lighter}10 100%)`,
              }}
            >
              <span className="profile-label" style={{ color: color.dark }}>
                {formattedKey}:
              </span>
              <span className="profile-value">{formatValue(value)}</span>
            </div>
          );
        })}

        {/* Regular fields */}
        {regularFields.map((key, idx) => {
          const value = data[key];
          if (key === "company_info" || value === null || value === undefined) return null;

          const formattedKey = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
          const color = getFieldColor(fieldIndex + importantFields.length + idx);

          if (typeof value === "object" && value !== null) {
            if (Array.isArray(value)) {
              return (
                <div key={key} className="profile-subsection" style={{ borderLeftColor: color.main }}>
                  <h4 className="profile-subsection-title" style={{ color: color.main, borderBottomColor: color.lightest }}>
                    {formattedKey}
                  </h4>
                  <div className="profile-list">
                    {value.map((item, itemIdx) => (
                      <div key={itemIdx} className="profile-list-item" style={{ borderLeftColor: getFieldColor(itemIdx % 5).main }}>
                        {typeof item === "object" ? <pre className="profile-json">{JSON.stringify(item, null, 2)}</pre> : <span>{item}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <div key={key} className="profile-subsection" style={{ borderLeftColor: color.main }}>
                <h4 className="profile-subsection-title" style={{ color: color.main, borderBottomColor: color.lightest }}>
                  {formattedKey}
                </h4>
                <div className="profile-nested">{renderProfileSectionWithColors(value, fieldIndex + importantFields.length + idx + 1)}</div>
              </div>
            );
          }

          return (
            <div
              key={key}
              className="profile-field"
              style={{
                borderLeftColor: color.main,
              }}
            >
              <span className="profile-label" style={{ color: color.dark }}>
                {formattedKey}:
              </span>
              <span className="profile-value">{formatValue(value)}</span>
            </div>
          );
        })}
      </>
    );
  };

  const profileName = getProfileName();
  const profileSubtitle = getProfileSubtitle();
  const typeColor = getProfileTypeColor();

  return (
    <div className="profile-container">
      <div className="profile-header" style={{ borderBottomColor: typeColor.main }}>
        <div className="profile-header-left">
          <h1 className="profile-title" style={{ color: typeColor.main, display: "flex", alignItems: "center" }}>
            <Box component="span" sx={{ display: "flex", alignItems: "center", mr: 1 }}>
              {getTitleIcon()}
            </Box>
            {getTitleText()}
          </h1>
          {profileName && (
            <div className="profile-name-display" style={{ color: typeColor.dark }}>
              {profileName}
            </div>
          )}
          {profileSubtitle && (
            <div className="profile-subtitle-display" style={{ color: typeColor.dark }}>
              {profileSubtitle}
            </div>
          )}
        </div>
        {user && (
          <div className="profile-user-info">
            <span className="profile-user-name">{user.name || user.email}</span>
            {user.role && (
              <span
                className="profile-user-role"
                style={{
                  background: `linear-gradient(135deg, ${typeColor.lightest} 0%, ${typeColor.lighter} 100%)`,
                  color: typeColor.darkest,
                  border: `1px solid ${typeColor.light}`,
                }}
              >
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
            )}
          </div>
        )}
      </div>
      {profileData ? (
        <Container maxWidth="lg" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
          {/* Professional Job Seeker Profile View */}
          {type === "candidate" ? (
            <JobSeekerProfileView profileData={profileData} typeColor={typeColor} />
          ) : (
            <div className="profile-content">
              {/* Main Profile Section */}
              <div className="profile-section">
                <h2
                  className="profile-section-header"
                  style={{ color: typeColor.main, borderBottomColor: typeColor.lightest, display: "flex", alignItems: "center" }}
                >
                  <Box component="span" sx={{ display: "flex", alignItems: "center", mr: 1 }}>
                    {type === "freelancer" ? (
                      <WorkIcon sx={{ fontSize: "1.5rem" }} />
                    ) : type === "company" ? (
                      <BusinessIcon sx={{ fontSize: "1.5rem" }} />
                    ) : type === "job" ? (
                      <DescriptionIcon sx={{ fontSize: "1.5rem" }} />
                    ) : type === "project" ? (
                      <RocketLaunchIcon sx={{ fontSize: "1.5rem" }} />
                    ) : (
                      <DescriptionIcon sx={{ fontSize: "1.5rem" }} />
                    )}
                  </Box>
                  {type === "freelancer"
                    ? "Professional Portfolio"
                    : type === "company"
                      ? "Company Information"
                      : type === "job"
                        ? "Job Information"
                        : type === "project"
                          ? "Project Information"
                          : "Profile Details"}
                </h2>
                <div className="profile-fields-container">{renderProfileSectionWithColors(profileData)}</div>
              </div>

              {/* Company Information Section (only for jobs/projects) */}
              {profileData.company_info && (
                <div className="profile-section">
                  <h2
                    className="profile-section-header"
                    style={{ color: COLORS.secondary.main, borderBottomColor: COLORS.secondary.lightest, display: "flex", alignItems: "center" }}
                  >
                    <Box component="span" sx={{ display: "flex", alignItems: "center", mr: 1 }}>
                      <BusinessIcon sx={{ fontSize: "1.5rem" }} />
                    </Box>
                    Company Information
                  </h2>
                  <div className="profile-fields-container">{renderProfileSectionWithColors(profileData.company_info, 10)}</div>
                </div>
              )}
            </div>
          )}
        </Container>
      ) : (
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <div className="profile-empty">
            <p>No profile data available.</p>
          </div>
        </Container>
      )}
    </div>
  );
};

// Professional Job Seeker Profile View Component - CV/LinkedIn Style
const JobSeekerProfileView = ({ profileData, typeColor }) => {
  const parseEducation = (education) => {
    if (!education) return [];
    if (typeof education === "string") {
      try {
        return JSON.parse(education);
      } catch {
        return [{ degree_name: education }];
      }
    }
    if (Array.isArray(education)) return education;
    return [education];
  };

  const parsePastJobs = (pastJobs) => {
    if (!pastJobs) return [];
    if (typeof pastJobs === "string") {
      try {
        return JSON.parse(pastJobs);
      } catch {
        return [];
      }
    }
    if (Array.isArray(pastJobs)) return pastJobs;
    return [];
  };

  const educationList = parseEducation(profileData.education);
  const pastJobsList = parsePastJobs(profileData.past_jobs);
  const location = `${profileData.city || ""}, ${profileData.country || ""}`.trim().replace(/^,\s*|,\s*$/g, "");

  return (
    <Box sx={{ maxWidth: 900, mx: "auto" }}>
      {/* Header Section - Profile Photo & Basic Info */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 3,
          background: `linear-gradient(135deg, ${typeColor.main}08 0%, ${typeColor.lightest} 100%)`,
          borderRadius: 2,
          border: `1px solid ${typeColor.lightest}`,
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems={{ xs: "center", sm: "flex-start" }}>
          <Avatar
            sx={{
              width: { xs: 120, sm: 150 },
              height: { xs: 120, sm: 150 },
              bgcolor: typeColor.main,
              fontSize: { xs: "3rem", sm: "4rem" },
              fontWeight: 700,
              border: `4px solid ${typeColor.lightest}`,
            }}
          >
            {profileData.full_name ? profileData.full_name.charAt(0).toUpperCase() : "J"}
          </Avatar>
          <Box sx={{ flex: 1, textAlign: { xs: "center", sm: "left" } }}>
            <Typography variant="h3" fontWeight={700} sx={{ color: typeColor.dark, mb: 1 }}>
              {profileData.full_name || "Job Seeker"}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: "center", sm: "flex-start" }} flexWrap="wrap" mb={2}>
              {profileData.experience_level && (
                <Typography variant="body1" sx={{ color: "text.secondary" }}>
                  {profileData.experience_level}
                </Typography>
              )}
              {profileData.domain && (
                <>
                  <Typography variant="body1" sx={{ color: "text.secondary" }}>
                    •
                  </Typography>
                  <Typography variant="body1" sx={{ color: "text.secondary" }}>
                    {profileData.domain}
                  </Typography>
                </>
              )}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: "center", sm: "flex-start" }} flexWrap="wrap" mb={2}>
              {location && (
                <Chip
                  icon={<LocationOn sx={{ fontSize: "1rem" }} />}
                  label={location}
                  size="small"
                  sx={{ bgcolor: `${typeColor.main}15`, color: typeColor.dark }}
                />
              )}
              {profileData.job_type && (
                <Chip
                  icon={<WorkIcon sx={{ fontSize: "1rem" }} />}
                  label={profileData.job_type}
                  size="small"
                  sx={{ bgcolor: `${typeColor.main}15`, color: typeColor.dark }}
                />
              )}
              {profileData.expected_salary && (
                <Chip
                  icon={<AttachMoney sx={{ fontSize: "1rem" }} />}
                  label={`$${profileData.expected_salary}`}
                  size="small"
                  sx={{ bgcolor: `${typeColor.main}15`, color: typeColor.dark }}
                />
              )}
            </Stack>
            {/* Contact Info */}
            <Stack direction="row" spacing={2} justifyContent={{ xs: "center", sm: "flex-start" }} flexWrap="wrap">
              {profileData.email && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Email sx={{ fontSize: "1rem", color: "text.secondary" }} />
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {profileData.email}
                  </Typography>
                </Stack>
              )}
              {profileData.phone_number && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Phone sx={{ fontSize: "1rem", color: "text.secondary" }} />
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {profileData.phone_number}
                  </Typography>
                </Stack>
              )}
              {profileData.linkedin_url && (
                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                  component="a"
                  href={profileData.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ textDecoration: "none", color: typeColor.main, "&:hover": { textDecoration: "underline" } }}
                >
                  <Language sx={{ fontSize: "1rem" }} />
                  <Typography variant="body2">LinkedIn</Typography>
                </Stack>
              )}
            </Stack>
          </Box>
        </Stack>
      </Paper>

      {/* About / Summary Section */}
      {profileData.career_objective && (
        <Card elevation={0} sx={{ mb: 3, border: `1px solid ${typeColor.lightest}`, borderRadius: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <PersonIcon sx={{ color: typeColor.main, fontSize: "1.5rem" }} />
              <Typography variant="h5" fontWeight={600} sx={{ color: typeColor.dark }}>
                About
              </Typography>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8, color: "text.primary" }}>
              {profileData.career_objective}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Experience Section */}
      {pastJobsList.length > 0 && (
        <Card elevation={0} sx={{ mb: 3, border: `1px solid ${typeColor.lightest}`, borderRadius: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <BusinessIcon sx={{ color: typeColor.main, fontSize: "1.5rem" }} />
              <Typography variant="h5" fontWeight={600} sx={{ color: typeColor.dark }}>
                Experience
              </Typography>
            </Stack>
            <Divider sx={{ mb: 3 }} />
            <Stack spacing={3}>
              {pastJobsList.map((job, idx) => (
                <Box key={idx}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: typeColor.main,
                        fontSize: "1.2rem",
                        mt: 0.5,
                      }}
                    >
                      {job.company_name ? job.company_name.charAt(0).toUpperCase() : "E"}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={600} sx={{ color: typeColor.dark, mb: 0.5 }}>
                        {job.title || job.position || "Position"}
                      </Typography>
                      <Typography variant="body2" sx={{ color: typeColor.main, mb: 0.5, fontWeight: 500 }}>
                        {job.company_name || "Company"}
                      </Typography>
                      {job.duration && (
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
                          {job.duration}
                        </Typography>
                      )}
                      {job.description && (
                        <Typography variant="body2" sx={{ color: "text.secondary", whiteSpace: "pre-wrap", mt: 1 }}>
                          {job.description}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                  {idx < pastJobsList.length - 1 && <Divider sx={{ mt: 3 }} />}
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Education Section */}
      {educationList.length > 0 && (
        <Card elevation={0} sx={{ mb: 3, border: `1px solid ${typeColor.lightest}`, borderRadius: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <School sx={{ color: typeColor.main, fontSize: "1.5rem" }} />
              <Typography variant="h5" fontWeight={600} sx={{ color: typeColor.dark }}>
                Education
              </Typography>
            </Stack>
            <Divider sx={{ mb: 3 }} />
            <Stack spacing={3}>
              {educationList.map((edu, idx) => (
                <Box key={idx}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: typeColor.main,
                        fontSize: "1.2rem",
                        mt: 0.5,
                      }}
                    >
                      <School />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={600} sx={{ color: typeColor.dark, mb: 0.5 }}>
                        {edu.degree_name || edu.degree || "Degree"}
                      </Typography>
                      {(edu.university_name || edu.university) && (
                        <Typography variant="body2" sx={{ color: typeColor.main, mb: 0.5, fontWeight: 500 }}>
                          {edu.university_name || edu.university}
                        </Typography>
                      )}
                      {edu.graduation_year && (
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {edu.graduation_year}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                  {idx < educationList.length - 1 && <Divider sx={{ mt: 3 }} />}
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Skills Section */}
      {profileData.skills && (
        <Card elevation={0} sx={{ mb: 3, border: `1px solid ${typeColor.lightest}`, borderRadius: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <WorkIcon sx={{ color: typeColor.main, fontSize: "1.5rem" }} />
              <Typography variant="h5" fontWeight={600} sx={{ color: typeColor.dark }}>
                Skills
              </Typography>
            </Stack>
            <Divider sx={{ mb: 3 }} />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {profileData.skills.split(",").map((skill, idx) => (
                <Chip
                  key={idx}
                  label={skill.trim()}
                  sx={{
                    bgcolor: `${typeColor.lightest}`,
                    color: typeColor.dark,
                    fontWeight: 500,
                    border: `1px solid ${typeColor.light}`,
                  }}
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Additional Information Section */}
      <Card elevation={0} sx={{ mb: 3, border: `1px solid ${typeColor.lightest}`, borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={2}>
            <CheckCircle sx={{ color: typeColor.main, fontSize: "1.5rem" }} />
            <Typography variant="h5" fontWeight={600} sx={{ color: typeColor.dark }}>
              Additional Information
            </Typography>
          </Stack>
          <Divider sx={{ mb: 3 }} />
          <Grid container spacing={2}>
            {profileData.experience_level && (
              <Grid item xs={12} sm={6}>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <AccessTime sx={{ color: typeColor.main, fontSize: "1.2rem" }} />
                  <Typography variant="subtitle2" fontWeight={600}>
                    Experience Level
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ pl: 4, color: "text.secondary" }}>
                  {profileData.experience_level}
                </Typography>
              </Grid>
            )}
            {profileData.domain && (
              <Grid item xs={12} sm={6}>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <TrendingUp sx={{ color: typeColor.main, fontSize: "1.2rem" }} />
                  <Typography variant="subtitle2" fontWeight={600}>
                    Domain
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ pl: 4, color: "text.secondary" }}>
                  {profileData.domain}
                </Typography>
              </Grid>
            )}
            {profileData.job_type && (
              <Grid item xs={12} sm={6}>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <WorkIcon sx={{ color: typeColor.main, fontSize: "1.2rem" }} />
                  <Typography variant="subtitle2" fontWeight={600}>
                    Preferred Job Type
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ pl: 4, color: "text.secondary" }}>
                  {profileData.job_type}
                </Typography>
              </Grid>
            )}
            {profileData.expected_salary && (
              <Grid item xs={12} sm={6}>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <AttachMoney sx={{ color: typeColor.main, fontSize: "1.2rem" }} />
                  <Typography variant="subtitle2" fontWeight={600}>
                    Expected Salary
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ pl: 4, color: "text.secondary" }}>
                  ${profileData.expected_salary}
                </Typography>
              </Grid>
            )}
            {profileData.date_of_birth && (
              <Grid item xs={12} sm={6}>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <CalendarToday sx={{ color: typeColor.main, fontSize: "1.2rem" }} />
                  <Typography variant="subtitle2" fontWeight={600}>
                    Date of Birth
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ pl: 4, color: "text.secondary" }}>
                  {new Date(profileData.date_of_birth).toLocaleDateString()}
                </Typography>
              </Grid>
            )}
            {profileData.gender && (
              <Grid item xs={12} sm={6}>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <PersonIcon sx={{ color: typeColor.main, fontSize: "1.2rem" }} />
                  <Typography variant="subtitle2" fontWeight={600}>
                    Gender
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ pl: 4, color: "text.secondary" }}>
                  {profileData.gender}
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Profile;
