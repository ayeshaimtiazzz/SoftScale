import React, { useMemo, useState, useEffect, useRef } from "react";
import { Box, Button, Card, CardContent, Grid, Stack, Typography, LinearProgress } from "@mui/material";
import { Work as WorkIcon, Assignment as ProjectIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import TopCandidates from "./top-candidates";
import TopJobsProjects from "./top-jobs-projects";
import MetricCards from "./metric-cards";
import "./styles.css";
import { API_BASE } from "config";
import { ROUTES, COLORS } from "../../constants";
import { useAuth } from "../../contexts/AuthContext";

const normalizeSkills = (skillsValue) => {
  if (!skillsValue) return [];
  if (Array.isArray(skillsValue)) return skillsValue.map((s) => String(s).trim().toLowerCase()).filter(Boolean);
  return String(skillsValue)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
};

const extractLeadSkills = (lead) => normalizeSkills(lead?.required_skills || lead?.skills || "");

const computeOverlapPercent = (userSkills = [], leadSkills = []) => {
  if (!userSkills.length || !leadSkills.length) return 0;
  const userSet = new Set(userSkills);
  const overlap = leadSkills.filter((skill) => userSet.has(skill)).length;
  return Math.round((overlap / Math.max(1, leadSkills.length)) * 100);
};

const getFreshnessLabel = (item) => {
  const timestamp = new Date(item?.created_at || item?.posted_at || item?.updated_at || 0).getTime();
  if (!timestamp) return "Unknown";
  const days = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
  if (days <= 2) return "Fresh";
  if (days <= 7) return "Recent";
  return "Aged";
};

const getClarityScore = (item) => {
  let score = 0;
  if (item?.required_skills) score += 30;
  if (item?.salary || item?.budget) score += 25;
  if (item?.required_experience || item?.experience_level) score += 20;
  if ((item?.job_description || item?.project_description || "").length > 80) score += 25;
  return score;
};

const LiveRoleInsights = ({
  role,
  jobs = [],
  projects = [],
  pursuits = {},
  metrics = {},
  userSkills = [],
  serverSkillRanking = null,
  serverBiddingRanking = null,
  serverSentimentRanking = null,
}) => {
  const isJobSeeker = role === "job_seeker";
  const pursuedJobs = pursuits?.job_prospects || [];
  const pursuedProjects = pursuits?.project_prospects || [];

  const priorityLeads = useMemo(() => {
    if (isJobSeeker) return (jobs || []).slice(0, 5);
    const prioritizedProjects = (projects || []).slice(0, 4);
    const contractJobs = (jobs || []).filter((job) => String(job?.job_type || "").toLowerCase() === "contract").slice(0, 2);
    return [...prioritizedProjects, ...contractJobs];
  }, [isJobSeeker, jobs, projects]);

  const fallbackBiddingRanking = useMemo(() => {
    return (projects || [])
      .map((project) => {
        const payout = Number(project?.salary || project?.budget || 0);
        const clarity = getClarityScore(project);
        const requiredSkills = extractLeadSkills(project);
        const skillFit = computeOverlapPercent(userSkills, requiredSkills);
        const competitiveness = Math.round((payout > 0 ? Math.min(50, payout / 600) : 15) + (clarity * 0.3) + (skillFit * 0.2));
        return {
          id: project?.id || project?.project_id || Math.random(),
          title: project?.project_title || project?.title || "Project",
          competitiveness,
          skillFit,
        };
      })
      .sort((a, b) => b.competitiveness - a.competitiveness)
      .slice(0, 4);
  }, [projects, userSkills]);

  const skillDemand = useMemo(() => {
    const sourceLeads = isJobSeeker ? jobs : [...projects, ...jobs];
    const demandMap = {};
    sourceLeads.forEach((lead) => {
      extractLeadSkills(lead).forEach((skill) => {
        demandMap[skill] = (demandMap[skill] || 0) + 1;
      });
    });
    return Object.entries(demandMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([skill, count]) => ({ skill, count }));
  }, [isJobSeeker, jobs, projects]);

  const matchedDemandSkills = (serverSkillRanking?.matched_skills || skillDemand.filter(({ skill }) => userSkills.includes(skill))).slice(0, 4);
  const missingDemandSkills = (serverSkillRanking?.missing_skills || skillDemand.filter(({ skill }) => !userSkills.includes(skill))).slice(0, 4);
  const skillRankScore = useMemo(() => {
    if (typeof serverSkillRanking?.skill_rank_score === "number") return serverSkillRanking.skill_rank_score;
    if (!skillDemand.length) return 0;
    const totalDemand = skillDemand.reduce((sum, item) => sum + item.count, 0);
    const matchedDemand = skillDemand
      .filter(({ skill }) => userSkills.includes(skill))
      .reduce((sum, item) => sum + item.count, 0);
    return Math.round((matchedDemand / Math.max(1, totalDemand)) * 100);
  }, [skillDemand, userSkills, serverSkillRanking]);

  const biddingRanking = serverBiddingRanking?.ranking?.length ? serverBiddingRanking.ranking : fallbackBiddingRanking;

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={7}>
        <Card sx={{ borderLeft: `4px solid ${COLORS.success.main}` }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              {isJobSeeker ? "Live Job Activity" : "Live Lead Activity"}
            </Typography>
            <Stack spacing={1}>
              {priorityLeads.slice(0, 4).map((lead, idx) => (
                <Box key={`${lead?.id || lead?.job_id || lead?.project_id || idx}`} sx={{ p: 1, border: `1px solid ${COLORS.neutral.gray200}`, borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {lead?.job_title || lead?.project_title || lead?.title || "Untitled"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isJobSeeker ? `${lead?.job_type || "Role"} | ${lead?.work_mode || "N/A"} | ${lead?.city || lead?.country || "Location N/A"}` : `${lead?.project_type || lead?.job_type || "Opportunity"} | Timeline: ${lead?.duration || "TBD"} | Effort: ${lead?.required_experience || "Mixed"}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Freshness: {getFreshnessLabel(lead)} | Clarity: {getClarityScore(lead)}% | Skill Fit: {computeOverlapPercent(userSkills, extractLeadSkills(lead))}%
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={5}>
        <Stack spacing={2}>
          <Card sx={{ borderLeft: `4px solid ${COLORS.accent.main}` }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                {isJobSeeker ? "Application Activity" : "CRM Activity"}
              </Typography>
              <Typography variant="body2">Active: {isJobSeeker ? pursuedJobs.length : pursuedJobs.length + pursuedProjects.length}</Typography>
              <Typography variant="body2">Profile Views: {metrics?.profileViews || 0}</Typography>
              <Typography variant="body2">Saved/Applied: {metrics?.savedJobs || metrics?.appliedJobs || 0}</Typography>
            </CardContent>
          </Card>
          {!isJobSeeker && (
            <Card sx={{ borderLeft: `4px solid ${COLORS.info.main}` }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  Skill-Based Bidders Ranking
                </Typography>
                <Stack spacing={0.5}>
                  {biddingRanking.length > 0 ? biddingRanking.map((item) => (
                    <Typography key={item.id} variant="body2">
                      {item.title}: Bid Score {item.bid_score ?? item.competitiveness} | Skill Fit {item.skill_fit ?? item.skillFit ?? 0}% | Prospects {item.prospects_count ?? 0} | Deals {item.related_deals_count ?? 0}
                    </Typography>
                  )) : <Typography variant="body2" color="text.secondary">No active project bidding signals yet.</Typography>}
                </Stack>
                {serverBiddingRanking?.feedback_impact?.note && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                    {serverBiddingRanking.feedback_impact.note}
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}
          <Card sx={{ borderLeft: `4px solid ${COLORS.secondary.main}` }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Sentiment Ranking
              </Typography>
              <Stack spacing={0.5}>
                {(serverSentimentRanking?.ranking || []).slice(0, 4).map((item) => (
                  <Typography key={`${item.analysis_id}-${item.deal_id}`} variant="body2">
                    {item.deal_title}: {item.sentiment} ({Math.round((item.sentiment_confidence || 0) * 100)}%) | rank {item.rank_score}
                  </Typography>
                ))}
                {!(serverSentimentRanking?.ranking || []).length && (
                  <Typography variant="body2" color="text.secondary">
                    No sentiment analyses found yet.
                  </Typography>
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                Ranking is updated based on feedback. If feedback is bad, ranking is lower.
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ borderLeft: `4px solid ${COLORS.primary.main}` }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Skills Rank & Needed Skills
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Your Skills Rank: {skillRankScore}/100
              </Typography>
              <LinearProgress variant="determinate" value={skillRankScore} sx={{ height: 8, borderRadius: 2, mb: 1 }} />
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Ranked Skills You Have
              </Typography>
              <Stack spacing={0.25} sx={{ mb: 1 }}>
                {matchedDemandSkills.length ? matchedDemandSkills.map((item) => (
                  <Typography key={item.skill} variant="caption">{item.skill}: demand {item.count}</Typography>
                )) : <Typography variant="caption" color="text.secondary">No ranked matched skills yet.</Typography>}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Skills You Need Next
              </Typography>
              <Stack spacing={0.25}>
                {missingDemandSkills.length ? missingDemandSkills.map((item) => (
                  <Typography key={item.skill} variant="caption">{item.skill} ({item.count} leads)</Typography>
                )) : <Typography variant="caption" color="text.secondary">No immediate gaps detected.</Typography>}
              </Stack>
              {serverSkillRanking?.feedback_impact?.note && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                  {serverSkillRanking.feedback_impact.note}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  );
};

const CompanyDashboard = ({ currentUser, authToken, metrics, sentimentRanking = null }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [companyPosts, setCompanyPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const companyPostsFetchRef = useRef(false);

  useEffect(() => {
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

  return (
    <Stack spacing={3}>
      <Card
        sx={{
          borderLeft: `4px solid ${COLORS.accent.main}`,
          backgroundColor: `${COLORS.accent.lightest}10`,
        }}
      >
        <CardContent>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", lg: "center" }}
            justifyContent="space-between"
          >
            <Typography variant="h6" sx={{ color: COLORS.accent.dark, fontWeight: 600 }}>
              {t("dashboard.companyWorkspaceCta")}
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                startIcon={<WorkIcon />}
                onClick={() => navigate(ROUTES.COMPANY_POST_JOB)}
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
                onClick={() => navigate(ROUTES.COMPANY_POST_PROJECT)}
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
              <Button variant="outlined" onClick={() => navigate(ROUTES.COMPANY_WORKSPACE)} sx={{ textTransform: "none", fontWeight: 600 }}>
                {t("dashboard.managePostings")}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderLeft: `4px solid ${COLORS.info.main}` }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Company Live Activity
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Sentiment Ranking
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Monitor deal communication quality and follow-up urgency.
              </Typography>
              <Typography variant="body2">Active Candidates: {metrics?.activeCandidates || 0}</Typography>
              <Typography variant="body2">Total Posts: {metrics?.totalPosts || companyPosts.length || 0}</Typography>
              <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                {(sentimentRanking?.ranking || []).slice(0, 3).map((item) => (
                  <Typography key={`${item.analysis_id}-${item.deal_id}`} variant="caption">
                    {item.deal_title}: {item.sentiment} ({Math.round((item.sentiment_confidence || 0) * 100)}%)
                  </Typography>
                ))}
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Bidding Users Ranking
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Track which open posts are attracting stronger bidding competition.
              </Typography>
              <Typography variant="body2">
                Competitive Posts: {(companyPosts || []).filter((post) => getClarityScore(post) >= 50).length}
              </Typography>
              <Typography variant="body2">
                Fresh Posts: {(companyPosts || []).filter((post) => getFreshnessLabel(post) === "Fresh").length}
              </Typography>
              <Typography variant="body2">
                Prospect-linked Bidding:{" "}
                {(companyPosts || []).filter((post) => Number(post?.prospects_count || post?.total_prospects || post?.applicant_count || 0) > 0).length}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
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
    </Stack>
  );
};

const FreelancerDashboard = ({
  jobs,
  projects,
  loading,
  user,
  token,
  metrics,
  userSkills = [],
  skillRanking = null,
  biddingRanking = null,
  sentimentRanking = null,
}) => {
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
    const sortedByRecency = [...combined].sort((a, b) => {
      const aDate = new Date(a.created_at || a.posted_at || a.updated_at || 0).getTime();
      const bDate = new Date(b.created_at || b.posted_at || b.updated_at || 0).getTime();
      return bDate - aDate;
    });
    return sortedByRecency.slice(0, 6);
  }, [jobs, projects]);

  const pursuedJobs = pursuits?.job_prospects || [];
  const pursuedProjects = pursuits?.project_prospects || [];
  const curatedFeed = role === "job_seeker" ? allPosts.filter((item) => item.type === "job") : allPosts;

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
      <LiveRoleInsights
        role={role}
        jobs={jobs}
        projects={projects}
        pursuits={pursuits}
        metrics={metrics}
        userSkills={userSkills}
        serverSkillRanking={skillRanking}
        serverBiddingRanking={biddingRanking}
        serverSentimentRanking={sentimentRanking}
      />

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
            {role === "job_seeker" ? "Recommended Jobs for You" : "Recommended Jobs & Projects for You"}
          </Typography>
          {loading ? <Typography variant="body2">{t("common.loading")}</Typography> : <TopJobsProjects jobsProjects={curatedFeed} userRole={role} />}
        </CardContent>
      </Card>
    </Stack>
  );
};

const Dashboard = () => {
  const { user, token } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [userSkills, setUserSkills] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [skillRanking, setSkillRanking] = useState(null);
  const [biddingRanking, setBiddingRanking] = useState(null);
  const [sentimentRanking, setSentimentRanking] = useState(null);

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

  useEffect(() => {
    const fetchServerRankings = async () => {
      if (!token || role === "guest") {
        setSkillRanking(null);
        setBiddingRanking(null);
        return;
      }
      try {
        const [skillRes, biddingRes, sentimentRes] = await Promise.allSettled([
          axios.get(`${API_BASE}/dashboard-skill-ranking`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { role },
          }),
          axios.get(`${API_BASE}/dashboard-bidding-ranking`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { role },
          }),
          axios.get(`${API_BASE}/dashboard-sentiment-ranking`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { role },
          }),
        ]);
        setSkillRanking(skillRes.status === "fulfilled" ? skillRes.value.data : null);
        setBiddingRanking(biddingRes.status === "fulfilled" ? biddingRes.value.data : null);
        setSentimentRanking(sentimentRes.status === "fulfilled" ? sentimentRes.value.data : null);
      } catch {
        setSkillRanking(null);
        setBiddingRanking(null);
        setSentimentRanking(null);
      }
    };
    fetchServerRankings();
  }, [role, token]);

  useEffect(() => {
    const fetchUserSkills = async () => {
      if (!token || (role !== "freelancer" && role !== "job_seeker")) {
        setUserSkills([]);
        return;
      }
      try {
        let profileId = null;
        let profileType = role === "freelancer" ? "freelancer" : "candidate";
        if (role === "job_seeker") {
          const seekerRes = await axios.get(`${API_BASE}/get-job-seeker-profile-id`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          profileId = seekerRes.data?.profile_id || seekerRes.data?.candidate_id;
        } else {
          const profileRes = await axios.get(`${API_BASE}/get-profile-id`, {
            params: { role: "freelancer" },
            headers: { Authorization: `Bearer ${token}` },
          });
          profileId = profileRes.data?.profile_id;
        }
        if (!profileId) {
          setUserSkills([]);
          return;
        }
        const dataRes = await axios.get(`${API_BASE}/profile/${profileId}?type=${profileType}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const profileData = dataRes.data?.data || dataRes.data || {};
        setUserSkills(normalizeSkills(profileData.skills));
      } catch (err) {
        setUserSkills([]);
      }
    };
    fetchUserSkills();
  }, [role, token]);

  return (
    <Box>
      <MetricCards metrics={metrics} loading={loadingMetrics} role={role} />

      {role === "company_admin" && (
        <CompanyDashboard currentUser={user} authToken={token} metrics={metrics} sentimentRanking={sentimentRanking} />
      )}

      {(role === "freelancer" || role === "job_seeker") && (
        <FreelancerDashboard
          jobs={jobs}
          projects={projects}
          loading={loadingData}
          user={user}
          token={token}
          metrics={metrics}
          userSkills={userSkills}
          skillRanking={skillRanking}
          biddingRanking={biddingRanking}
          sentimentRanking={sentimentRanking}
        />
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
