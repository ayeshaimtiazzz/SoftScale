/**
 * Talent Details Component
 * Professional, elaborate view for talent matches and leads
 * Separate from user profile - focuses on jobs, projects, companies, candidates, freelancers
 */

import React, { useState, useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Stack,
  Divider,
  Avatar,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  LocationOn,
  AttachMoney,
  Work,
  Business,
  AccessTime,
  School,
  Email,
  Phone,
  Language,
  People,
  TrendingUp,
  CalendarToday,
  CheckCircle,
  Star,
  Description,
  RocketLaunch,
  Person,
  Assignment,
} from '@mui/icons-material';
import { API_BASE } from "config";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../contexts/AuthContext";
import { STORAGE_KEYS, COLORS } from "../../constants";
import './styles.css';

const TalentDetails = () => {
  const location = useLocation();
  const { showToast } = useToast();
  const { user, token } = useAuth();
  const { item, role: stateRole } = location.state || {};
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Determine type from item (even if item is null, we need to determine type before early return)
  let id = item?.id;
  let type = "";
  let role = stateRole || user?.role;

  if (item) {
    if (item.type) {
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
      }
    } else {
      // Fallback logic
      if (item.name && !item.title) {
        type = item.email ? "freelancer" : "candidate";
      } else if (item.title) {
        type = item.project_type ? "project" : "job";
      } else if (item.company_name) {
        type = "company";
      }
    }
  }

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id || !type) {
        setError("Invalid profile information. Missing ID or type.");
        setLoading(false);
        return;
      }

      let authToken = token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (authToken && typeof authToken === "string") {
        authToken = authToken.trim().replace(/^["']|["']$/g, "");
      }

      try {
        const headers = {
          "Content-Type": "application/json",
        };
        if (authToken) {
          headers.Authorization = `Bearer ${authToken}`;
        }

        const response = await axios.get(`${API_BASE}/api/profile/${id}?type=${type}`, {
          headers,
        });

        const data = response.data.data || response.data;
        if (!data) {
          throw new Error("No profile data received from server");
        }

        setProfileData(data);
      } catch (err) {
        const errorMsg = err.response?.data?.detail || err.message || "Failed to load profile.";
        showToast(errorMsg, "error");
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id, type, token, showToast]);

  // If no item provided, redirect to profile page (after hooks)
  if (!item) {
    return <Navigate to="/profile" replace />;
  }

  // Get type-specific color scheme
  const getTypeColor = () => {
    switch (type) {
      case "job":
        return COLORS.success;
      case "project":
        return COLORS.secondary;
      case "company":
        return COLORS.primary;
      case "candidate":
        return COLORS.info;
      case "freelancer":
        return COLORS.accent;
      default:
        return COLORS.primary;
    }
  };

  // Get type-specific icon
  const getTypeIcon = () => {
    switch (type) {
      case "job":
        return <Work sx={{ fontSize: "2.5rem" }} />;
      case "project":
        return <RocketLaunch sx={{ fontSize: "2.5rem" }} />;
      case "company":
        return <Business sx={{ fontSize: "2.5rem" }} />;
      case "candidate":
        return <Person sx={{ fontSize: "2.5rem" }} />;
      case "freelancer":
        return <Assignment sx={{ fontSize: "2.5rem" }} />;
      default:
        return <Description sx={{ fontSize: "2.5rem" }} />;
    }
  };

  // Get title based on type
  const getTitle = () => {
    if (!profileData) return item?.title || item?.name || "Details";
    switch (type) {
      case "job":
        return profileData.job_title || item?.title || "Job Opportunity";
      case "project":
        return profileData.project_title || item?.title || "Project";
      case "company":
        return profileData.company_name || item?.company_name || "Company";
      case "candidate":
        return profileData.full_name || item?.name || "Candidate";
      case "freelancer":
        return profileData.full_name || item?.name || "Freelancer";
      default:
        return item?.title || item?.name || "Details";
    }
  };

  const typeColor = getTypeColor();

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress sx={{ color: typeColor.main }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!profileData) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">No profile data available.</Alert>
      </Container>
    );
  }

  // Render based on type
  if (type === "job") {
    return <JobDetailsView data={profileData} item={item} typeColor={typeColor} />;
  } else if (type === "project") {
    return <ProjectDetailsView data={profileData} item={item} typeColor={typeColor} />;
  } else if (type === "company") {
    return <CompanyDetailsView data={profileData} item={item} typeColor={typeColor} />;
  } else if (type === "candidate") {
    return <CandidateDetailsView data={profileData} item={item} typeColor={typeColor} />;
  } else if (type === "freelancer") {
    return <FreelancerDetailsView data={profileData} item={item} typeColor={typeColor} />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Alert severity="info">Unknown profile type.</Alert>
    </Container>
  );
};

// Job Details View Component
const JobDetailsView = ({ data, item, typeColor }) => {
  const title = data.job_title || item?.title || "Job Opportunity";
  const company = data.company_info?.company_name || item?.company_name || data.company_name || "Company";
  const location = `${data.city || item?.city || ""}, ${data.country || item?.country || ""}`.trim().replace(/^,\s*|,\s*$/g, "");
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Hero Section */}
      <Paper
        elevation={3}
        sx={{
          p: 4,
          mb: 4,
          background: `linear-gradient(135deg, ${typeColor.main}15 0%, ${typeColor.lightest} 100%)`,
          borderLeft: `6px solid ${typeColor.main}`,
        }}
      >
        <Stack direction="row" spacing={3} alignItems="center">
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: typeColor.main,
              fontSize: "2rem",
            }}
          >
            <Work />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h3" fontWeight={700} sx={{ color: typeColor.dark, mb: 1 }}>
              {title}
            </Typography>
            <Typography variant="h6" sx={{ color: typeColor.dark, mb: 2, opacity: 0.8 }}>
              {company}
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {location && (
                <Chip
                  icon={<LocationOn />}
                  label={location}
                  sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }}
                />
              )}
              {data.work_mode && (
                <Chip
                  icon={<Work />}
                  label={data.work_mode}
                  sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }}
                />
              )}
              {data.job_type && (
                <Chip
                  label={data.job_type}
                  sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }}
                />
              )}
              {data.preferred_domain && (
                <Chip
                  label={data.preferred_domain}
                  sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }}
                />
              )}
            </Stack>
          </Box>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        {/* Key Information */}
        <Grid item xs={12} md={8}>
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h5" fontWeight={600} sx={{ color: typeColor.main, mb: 2 }}>
                Job Description
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
                {data.job_description || "No description available."}
              </Typography>
            </CardContent>
          </Card>

          {data.required_skills && (
            <Card elevation={2} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5" fontWeight={600} sx={{ color: typeColor.main, mb: 2 }}>
                  Required Skills
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {data.required_skills.split(',').map((skill, idx) => (
                    <Chip
                      key={idx}
                      label={skill.trim()}
                      sx={{ bgcolor: `${typeColor.lightest}`, color: typeColor.dark }}
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Sidebar - Important Details */}
        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ mb: 3, position: "sticky", top: 20 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ color: typeColor.main, mb: 2 }}>
                Key Details
              </Typography>
              <Stack spacing={2}>
                {data.salary && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <AttachMoney sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>Salary</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.salary}
                    </Typography>
                  </Box>
                )}
                {data.required_experience && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <AccessTime sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>Experience</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.required_experience}
                    </Typography>
                  </Box>
                )}
                {data.preferred_domain && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <TrendingUp sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>Domain</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.preferred_domain}
                    </Typography>
                  </Box>
                )}
                {data.work_mode && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <Work sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>Work Mode</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.work_mode}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>

          {data.company_info && (
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} sx={{ color: typeColor.main, mb: 2 }}>
                  Company Info
                </Typography>
                <Stack spacing={1.5}>
                  {data.company_info.company_name && (
                    <Typography variant="body2">
                      <strong>Name:</strong> {data.company_info.company_name}
                    </Typography>
                  )}
                  {data.company_info.domain && (
                    <Typography variant="body2">
                      <strong>Domain:</strong> {data.company_info.domain}
                    </Typography>
                  )}
                  {data.company_info.company_size && (
                    <Typography variant="body2">
                      <strong>Size:</strong> {data.company_info.company_size}
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

// Project Details View Component
const ProjectDetailsView = ({ data, item, typeColor }) => {
  const title = data.project_title || item?.title || "Project";
  const company = data.company_info?.company_name || item?.company_name || data.company_name || "Company";
  const location = `${data.city || item?.city || ""}, ${data.country || item?.country || ""}`.trim().replace(/^,\s*|,\s*$/g, "");
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Hero Section */}
      <Paper
        elevation={3}
        sx={{
          p: 4,
          mb: 4,
          background: `linear-gradient(135deg, ${typeColor.main}15 0%, ${typeColor.lightest} 100%)`,
          borderLeft: `6px solid ${typeColor.main}`,
        }}
      >
        <Stack direction="row" spacing={3} alignItems="center">
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: typeColor.main,
              fontSize: "2rem",
            }}
          >
            <RocketLaunch />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h3" fontWeight={700} sx={{ color: typeColor.dark, mb: 1 }}>
              {title}
            </Typography>
            <Typography variant="h6" sx={{ color: typeColor.dark, mb: 2, opacity: 0.8 }}>
              {company}
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {location && (
                <Chip
                  icon={<LocationOn />}
                  label={location}
                  sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }}
                />
              )}
              {data.project_type && (
                <Chip
                  label={data.project_type}
                  sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }}
                />
              )}
              {data.payment_type && (
                <Chip
                  icon={<AttachMoney />}
                  label={data.payment_type}
                  sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }}
                />
              )}
              {data.domain && (
                <Chip
                  label={data.domain}
                  sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }}
                />
              )}
            </Stack>
          </Box>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h5" fontWeight={600} sx={{ color: typeColor.main, mb: 2 }}>
                Project Description
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
                {data.project_description || "No description available."}
              </Typography>
            </CardContent>
          </Card>

          {data.required_skills && (
            <Card elevation={2} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5" fontWeight={600} sx={{ color: typeColor.main, mb: 2 }}>
                  Required Skills
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {data.required_skills.split(',').map((skill, idx) => (
                    <Chip
                      key={idx}
                      label={skill.trim()}
                      sx={{ bgcolor: `${typeColor.lightest}`, color: typeColor.dark }}
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ mb: 3, position: "sticky", top: 20 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ color: typeColor.main, mb: 2 }}>
                Project Details
              </Typography>
              <Stack spacing={2}>
                {data.budget && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <AttachMoney sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>Budget</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.budget}
                    </Typography>
                  </Box>
                )}
                {data.payment_type && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <AttachMoney sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>Payment Type</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.payment_type}
                    </Typography>
                  </Box>
                )}
                {data.project_type && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <RocketLaunch sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>Project Type</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.project_type}
                    </Typography>
                  </Box>
                )}
                {data.domain && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <TrendingUp sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>Domain</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.domain}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

// Company Details View Component
const CompanyDetailsView = ({ data, item, typeColor }) => {
  const name = data.company_name || item?.company_name || "Company";
  const location = `${data.city || item?.city || ""}, ${data.country || item?.country || ""}`.trim().replace(/^,\s*|,\s*$/g, "");
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Hero Section */}
      <Paper
        elevation={3}
        sx={{
          p: 4,
          mb: 4,
          background: `linear-gradient(135deg, ${typeColor.main}15 0%, ${typeColor.lightest} 100%)`,
          borderLeft: `6px solid ${typeColor.main}`,
        }}
      >
        <Stack direction="row" spacing={3} alignItems="center">
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: typeColor.main,
              fontSize: "2rem",
            }}
          >
            <Business />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h3" fontWeight={700} sx={{ color: typeColor.dark, mb: 2 }}>
              {name}
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {location && (
                <Chip
                  icon={<LocationOn />}
                  label={location}
                  sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }}
                />
              )}
              {data.domain && (
                <Chip
                  label={data.domain}
                  sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }}
                />
              )}
              {data.company_size && (
                <Chip
                  icon={<People />}
                  label={data.company_size}
                  sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }}
                />
              )}
            </Stack>
          </Box>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {data.company_description && (
            <Card elevation={2} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5" fontWeight={600} sx={{ color: typeColor.main, mb: 2 }}>
                  About Company
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
                  {data.company_description}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ position: "sticky", top: 20 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ color: typeColor.main, mb: 2 }}>
                Company Information
              </Typography>
              <Stack spacing={2}>
                {data.domain && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <TrendingUp sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>Domain</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.domain}
                    </Typography>
                  </Box>
                )}
                {data.company_size && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <People sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>Company Size</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.company_size}
                    </Typography>
                  </Box>
                )}
                {location && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <LocationOn sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>Location</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {location}
                    </Typography>
                  </Box>
                )}
                {data.email && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <Email sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>Email</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.email}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

// Candidate Details View Component
const CandidateDetailsView = ({ data, item, typeColor }) => {
  const name = data.full_name || item?.name || "Candidate";
  const location = `${data.city || item?.city || ""}, ${data.country || item?.country || ""}`.trim().replace(/^,\s*|,\s*$/g, "");
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Hero Section */}
      <Paper
        elevation={3}
        sx={{
          p: 4,
          mb: 4,
          background: `linear-gradient(135deg, ${typeColor.main}15 0%, ${typeColor.lightest} 100%)`,
          borderLeft: `6px solid ${typeColor.main}`,
        }}
      >
        <Stack direction="row" spacing={3} alignItems="center">
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: typeColor.main,
              fontSize: "2rem",
            }}
          >
            {name.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h3" fontWeight={700} sx={{ color: typeColor.dark, mb: 1 }}>
              {name}
            </Typography>
            <Typography variant="h6" sx={{ color: typeColor.dark, mb: 2, opacity: 0.8 }}>
              Job Seeker
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {location && (
                <Chip
                  icon={<LocationOn />}
                  label={location}
                  sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }}
                />
              )}
              {data.experience_level && (
                <Chip
                  icon={<AccessTime />}
                  label={data.experience_level}
                  sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }}
                />
              )}
              {data.domain && (
                <Chip
                  label={data.domain}
                  sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }}
                />
              )}
            </Stack>
          </Box>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {data.career_objective && (
            <Card elevation={2} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5" fontWeight={600} sx={{ color: typeColor.main, mb: 2 }}>
                  Career Objective
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
                  {data.career_objective}
                </Typography>
              </CardContent>
            </Card>
          )}

          {data.skills && (
            <Card elevation={2} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5" fontWeight={600} sx={{ color: typeColor.main, mb: 2 }}>
                  Skills
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {data.skills.split(',').map((skill, idx) => (
                    <Chip
                      key={idx}
                      label={skill.trim()}
                      sx={{ bgcolor: `${typeColor.lightest}`, color: typeColor.dark }}
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          {data.education && (
            <Card elevation={2} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5" fontWeight={600} sx={{ color: typeColor.main, mb: 2 }}>
                  Education
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
                  {typeof data.education === 'string' ? data.education : JSON.stringify(data.education)}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ position: "sticky", top: 20 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ color: typeColor.main, mb: 2 }}>
                Key Information
              </Typography>
              <Stack spacing={2}>
                {data.experience_level && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <AccessTime sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>Experience</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.experience_level}
                    </Typography>
                  </Box>
                )}
                {data.domain && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <TrendingUp sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>Domain</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.domain}
                    </Typography>
                  </Box>
                )}
                {data.job_type && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <Work sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>Job Type</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.job_type}
                    </Typography>
                  </Box>
                )}
                {data.expected_salary && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <AttachMoney sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>Expected Salary</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.expected_salary}
                    </Typography>
                  </Box>
                )}
                {data.email && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <Email sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>Email</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.email}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

// Freelancer Details View Component
const FreelancerDetailsView = ({ data, item, typeColor }) => {
  const name = data.full_name || item?.name || "Freelancer";
  const location = `${data.city || item?.city || ""}, ${data.country || item?.country || ""}`.trim().replace(/^,\s*|,\s*$/g, "");
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Hero Section */}
      <Paper
        elevation={3}
        sx={{
          p: 4,
          mb: 4,
          background: `linear-gradient(135deg, ${typeColor.main}15 0%, ${typeColor.lightest} 100%)`,
          borderLeft: `6px solid ${typeColor.main}`,
        }}
      >
        <Stack direction="row" spacing={3} alignItems="center">
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: typeColor.main,
              fontSize: "2rem",
            }}
          >
            {name.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h3" fontWeight={700} sx={{ color: typeColor.dark, mb: 1 }}>
              {name}
            </Typography>
            <Typography variant="h6" sx={{ color: typeColor.dark, mb: 2, opacity: 0.8 }}>
              Freelancer
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {location && (
                <Chip
                  icon={<LocationOn />}
                  label={location}
                  sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }}
                />
              )}
              {data.hourly_rate && (
                <Chip
                  icon={<AttachMoney />}
                  label={`$${data.hourly_rate}/hr`}
                  sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }}
                />
              )}
              {data.domain && (
                <Chip
                  label={data.domain}
                  sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }}
                />
              )}
            </Stack>
          </Box>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {data.professional_summary && (
            <Card elevation={2} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5" fontWeight={600} sx={{ color: typeColor.main, mb: 2 }}>
                  Professional Summary
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
                  {data.professional_summary}
                </Typography>
              </CardContent>
            </Card>
          )}

          {data.skills && (
            <Card elevation={2} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5" fontWeight={600} sx={{ color: typeColor.main, mb: 2 }}>
                  Skills
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {data.skills.split(',').map((skill, idx) => (
                    <Chip
                      key={idx}
                      label={skill.trim()}
                      sx={{ bgcolor: `${typeColor.lightest}`, color: typeColor.dark }}
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ position: "sticky", top: 20 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ color: typeColor.main, mb: 2 }}>
                Key Information
              </Typography>
              <Stack spacing={2}>
                {data.hourly_rate && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <AttachMoney sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>Hourly Rate</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      ${data.hourly_rate}/hr
                    </Typography>
                  </Box>
                )}
                {data.experience_level && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <AccessTime sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>Experience</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.experience_level}
                    </Typography>
                  </Box>
                )}
                {data.domain && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <TrendingUp sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>Domain</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.domain}
                    </Typography>
                  </Box>
                )}
                {data.work_preference && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <Work sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>Work Preference</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.work_preference}
                    </Typography>
                  </Box>
                )}
                {data.email && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <Email sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>Email</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.email}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default TalentDetails;
