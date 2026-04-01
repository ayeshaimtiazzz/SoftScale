import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Card, CardContent, Avatar, Typography, Grid, Tooltip, IconButton, CircularProgress, Alert } from "@mui/material";
import { TrendingUp, Star, Visibility } from "@mui/icons-material";
import axios from "axios";
import { ROUTES } from "../../constants";
import { COLORS } from "../../constants";
import { API_BASE } from "../../config";
import { useAuth } from "../../contexts/AuthContext";

const getInitials = (name = "U") => {
  const parts = String(name).split(" ");
  return parts[0][0] + (parts[1] ? parts[1][0] : "");
};

const getAvatarColor = (name) => {
  const colors = [COLORS.primary.main, COLORS.info.main, COLORS.success.main, COLORS.accent.main, COLORS.secondary.main];
  const index = (name?.charCodeAt(0) || 0) % colors.length;
  return colors[index];
};

const getMatchColor = (match) => {
  if (match >= 90) return COLORS.success.main;
  if (match >= 75) return COLORS.info.main;
  if (match >= 60) return COLORS.accent.main;
  return COLORS.secondary.main;
};

const TopCandidates = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const normalizePostType = (type) => (type === "projects" ? "project" : type);
    const sortPostsByIdDesc = (posts) => [...posts].sort((a, b) => Number(b.id || 0) - Number(a.id || 0));

    const toMatchParams = (postType, postDetail, postId) => {
      const params = { post_id: postId, top_k: 6 };
      if (!postDetail) return params;

      if (postDetail.experience_level) params.experience_level = postDetail.experience_level;
      if (postDetail.work_mode) params.work_mode = postDetail.work_mode;
      if (postDetail.country) params.country = postDetail.country;
      if (postDetail.city) params.city = postDetail.city;
      if (postType === "job" && postDetail.job_type) params.job_type = postDetail.job_type;
      if (postType === "project" && postDetail.project_type) params.project_type = postDetail.project_type;
      return params;
    };

    const fetchCandidates = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const postsResponse = await axios.get(`${API_BASE}/get-company-posts`, { headers });
        const rawPosts = Array.isArray(postsResponse.data?.posts) ? postsResponse.data.posts : [];
        const companyPosts = rawPosts.map((post) => ({ ...post, type: normalizePostType(post.type) }));

        const jobPost = sortPostsByIdDesc(companyPosts.filter((post) => post.type === "job"))[0] || null;
        const projectPost = sortPostsByIdDesc(companyPosts.filter((post) => post.type === "project"))[0] || null;

        if (!jobPost && !projectPost) {
          if (!mounted) return;
          setCandidates([]);
          setError("No job/project posts found. Post a job or project to see matched candidates.");
          return;
        }

        const [jobsResponse, projectsResponse] = await Promise.all([
          axios.get(`${API_BASE}/jobs`, { headers }),
          axios.get(`${API_BASE}/projects`, { headers }),
        ]);

        const jobs = Array.isArray(jobsResponse.data) ? jobsResponse.data : [];
        const projects = Array.isArray(projectsResponse.data) ? projectsResponse.data : [];
        const selectedJobDetails = jobPost ? jobs.find((job) => Number(job.job_id) === Number(jobPost.id)) : null;
        const selectedProjectDetails = projectPost ? projects.find((project) => Number(project.project_id) === Number(projectPost.id)) : null;

        const matchingRequests = [];
        if (jobPost) {
          matchingRequests.push({
            label: `Job: ${jobPost.title}`,
            promise: axios.get(`${API_BASE}/talent-match`, {
              headers,
              params: toMatchParams("job", selectedJobDetails, jobPost.id),
            }),
          });
        }
        if (projectPost) {
          matchingRequests.push({
            label: `Project: ${projectPost.title}`,
            promise: axios.get(`${API_BASE}/talent-match`, {
              headers,
              params: toMatchParams("project", selectedProjectDetails, projectPost.id),
            }),
          });
        }

        const settled = await Promise.allSettled(matchingRequests.map((request) => request.promise));
        if (!mounted) return;

        const mergedByCandidate = new Map();
        settled.forEach((result, index) => {
          if (result.status !== "fulfilled") return;
          const sourceLabel = matchingRequests[index].label;
          const matches = Array.isArray(result.value?.data?.matches) ? result.value.data.matches : [];

          matches.forEach((candidate) => {
            const candidateKey = `${candidate.type || "candidate"}-${candidate.id || candidate.email || candidate.name}`;
            const score = Number(candidate.match_score ?? candidate.score ?? 0);
            if (!mergedByCandidate.has(candidateKey)) {
              mergedByCandidate.set(candidateKey, { ...candidate, match: score, sources: [sourceLabel] });
              return;
            }
            const current = mergedByCandidate.get(candidateKey);
            mergedByCandidate.set(candidateKey, {
              ...current,
              ...candidate,
              match: Math.max(current.match || 0, score),
              sources: Array.from(new Set([...(current.sources || []), sourceLabel])),
            });
          });
        });

        const normalized = Array.from(mergedByCandidate.values())
          .sort((a, b) => Number(b.match || 0) - Number(a.match || 0))
          .slice(0, 6)
          .map((candidate, index) => ({
            ...candidate,
            name: candidate.name || "Unknown",
            match: candidate.match || Math.max(65, 95 - index * 3),
            type: candidate.type || "candidate",
          }));

        setCandidates(normalized);
        setError(normalized.length === 0 ? "No matched candidates found from your current job/project filters." : "");
      } catch (err) {
        if (!mounted) return;
        setError(err.response?.data?.detail || "Failed to load matched top candidates.");
        setCandidates([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchCandidates();
    return () => {
      mounted = false;
    };
  }, [token]);

  const handleViewCandidate = (candidate) => {
    const candidateId = candidate.id || candidate.candidate_id || candidate.freelancer_id;
    if (!candidateId) return;
    navigate(ROUTES.TALENT_DETAILS, {
      state: {
        item: { ...candidate, id: candidateId, type: candidate.type || "candidate" },
        role: "company_admin",
      },
    });
  };

  return (
    <Box>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          color: COLORS.primary.dark,
          mb: 3,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <TrendingUp sx={{ color: COLORS.primary.main }} />
        Top Candidates
      </Typography>
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={2}>
        {candidates.map((candidate, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              sx={{
                height: "100%",
                borderLeft: `4px solid ${getAvatarColor(candidate.name)}`,
                boxShadow: `0 2px 8px ${COLORS.neutral.gray300}`,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  transform: "translateY(-8px) scale(1.02)",
                  boxShadow: `0 8px 24px ${getAvatarColor(candidate.name)}40`,
                  borderLeft: `4px solid ${getAvatarColor(candidate.name)}`,
                },
                position: "relative",
                overflow: "hidden",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background: `linear-gradient(90deg, ${getAvatarColor(candidate.name)}, ${COLORS.primary.light})`,
                  opacity: 0,
                  transition: "opacity 0.3s",
                },
                "&:hover::before": {
                  opacity: 1,
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: getAvatarColor(candidate.name),
                      width: 56,
                      height: 56,
                      fontSize: "1.5rem",
                      fontWeight: 700,
                      mr: 2,
                      boxShadow: `0 4px 12px ${getAvatarColor(candidate.name)}50`,
                    }}
                  >
                    {getInitials(candidate.name)}
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
                      {candidate.name}
                    </Typography>
                    {candidate.skills && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: "0.875rem" }}
                      >
                        {candidate.skills}
                      </Typography>
                    )}
                    {Array.isArray(candidate.sources) && candidate.sources.length > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                        {candidate.sources.join(" | ")}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mt: 2,
                    pt: 2,
                    borderTop: `1px solid ${COLORS.neutral.gray200}`,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Star
                      sx={{
                        fontSize: 20,
                        color: getMatchColor(candidate.match),
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: getMatchColor(candidate.match),
                      }}
                    >
                      {Math.round(candidate.match)}% Match
                    </Typography>
                  </Box>
                  <Tooltip title="View Details" arrow>
                    <IconButton
                      onClick={() => handleViewCandidate(candidate)}
                      sx={{
                        border: `1px solid ${COLORS.neutral.gray200}`,
                        color: getMatchColor(candidate.match),
                        "&:hover": {
                          backgroundColor: `${getMatchColor(candidate.match)}15`,
                        },
                      }}
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default TopCandidates;


