import React, { useEffect, useMemo, useState } from "react";
import { Box, Card, CardContent, Typography, Grid, Stack, LinearProgress, Chip, List, ListItemButton, ListItemText } from "@mui/material";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import { useLocation } from "react-router-dom";
import { COLORS } from "../../constants";
import PageTitle from "../../components/common/PageTitle";
import axios from "axios";
import { API_BASE } from "../../config";
import { useAuth } from "../../contexts/AuthContext";

function Rankings() {
  const location = useLocation();
  const { token, user } = useAuth();
  const query = new URLSearchParams(location.search);
  const initialPanel = query.get("panel") || "user";
  const [panel, setPanel] = useState(initialPanel);
  const [skillRanking, setSkillRanking] = useState(null);
  const [sentimentRanking, setSentimentRanking] = useState(null);
  const [biddingRanking, setBiddingRanking] = useState(null);

  const role = useMemo(() => {
    let normalizedRole = user?.role || "guest";
    if (normalizedRole === "jobseeker") normalizedRole = "job_seeker";
    return normalizedRole;
  }, [user?.role]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!token || role === "guest") {
        setSkillRanking(null);
        setSentimentRanking(null);
        setBiddingRanking(null);
        return;
      }
      try {
        const [skillRes, sentimentRes, biddingRes] = await Promise.allSettled([
          axios.get(`${API_BASE}/dashboard-skill-ranking`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { role },
          }),
          axios.get(`${API_BASE}/dashboard-sentiment-ranking`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { role },
          }),
          axios.get(`${API_BASE}/dashboard-bidding-ranking`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { role },
          }),
        ]);
        setSkillRanking(skillRes.status === "fulfilled" ? skillRes.value.data : null);
        setSentimentRanking(sentimentRes.status === "fulfilled" ? sentimentRes.value.data : null);
        setBiddingRanking(biddingRes.status === "fulfilled" ? biddingRes.value.data : null);
      } catch {
        setSkillRanking(null);
        setSentimentRanking(null);
        setBiddingRanking(null);
      }
    };
    fetchAnalytics();
  }, [token, role]);

  const topSentimentAvg = useMemo(() => {
    const rows = (sentimentRanking?.ranking || []).slice(0, 5);
    if (!rows.length) return 0;
    return Math.round(rows.reduce((sum, row) => sum + (row.rank_score || 0), 0) / rows.length);
  }, [sentimentRanking]);

  const topBidderAvg = useMemo(() => {
    const rows = (biddingRanking?.ranking || []).slice(0, 5);
    if (!rows.length) return 0;
    return Math.round(rows.reduce((sum, row) => sum + (row.bid_score || 0), 0) / rows.length);
  }, [biddingRanking]);

  const skillScore = skillRanking?.skill_rank_score || 0;
  const compositeRank = Math.round((skillScore * 0.5) + (topSentimentAvg * 0.3) + (topBidderAvg * 0.2));

  return (
    <Box sx={{ p: 3 }}>
      <PageTitle
        title="Analytical Rankings"
        subtitle="User, skill, bidder, and sentiment-based rankings"
        icon={<InsightsOutlinedIcon sx={{ fontSize: "2rem" }} />}
        color={COLORS.secondary.main}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card sx={{ p: 1.5, position: "sticky", top: 16 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, px: 1 }}>
              Ranking Panels
            </Typography>
            <List disablePadding>
              <ListItemButton selected={panel === "user"} onClick={() => setPanel("user")}>
                <ListItemText primary="User Ranking" secondary="Overall weighted rank" />
              </ListItemButton>
              <ListItemButton selected={panel === "skills"} onClick={() => setPanel("skills")}>
                <ListItemText primary="Skills Ranking" secondary="Rank, gaps, and demand" />
              </ListItemButton>
              <ListItemButton selected={panel === "bidder"} onClick={() => setPanel("bidder")}>
                <ListItemText primary="Bidder Ranking" secondary="Skill-fit, prospects, deals" />
              </ListItemButton>
              <ListItemButton selected={panel === "sentiment"} onClick={() => setPanel("sentiment")}>
                <ListItemText primary="Sentiment Ranking" secondary="Ranked deal sentiment" />
              </ListItemButton>
            </List>
          </Card>
        </Grid>

        <Grid item xs={12} md={9}>
          {panel === "user" && (
            <Card sx={{ p: 2, borderLeft: `4px solid ${COLORS.info.main}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  User Ranking Analytics
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Composite Rank: {compositeRank}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Ranking is updated based on feedback. If feedback is bad, ranking will be low.
                </Typography>
                <Stack spacing={1} sx={{ mt: 2 }}>
                  <Box>
                    <Typography variant="caption">Skill Contribution</Typography>
                    <LinearProgress variant="determinate" value={Math.min(100, skillScore)} sx={{ height: 8, borderRadius: 2 }} />
                  </Box>
                  <Box>
                    <Typography variant="caption">Bidder Contribution</Typography>
                    <LinearProgress variant="determinate" value={Math.min(100, topBidderAvg)} sx={{ height: 8, borderRadius: 2 }} />
                  </Box>
                  <Box>
                    <Typography variant="caption">Sentiment Contribution</Typography>
                    <LinearProgress variant="determinate" value={Math.min(100, topSentimentAvg)} sx={{ height: 8, borderRadius: 2 }} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}

          {panel === "skills" && (
            <Card sx={{ p: 2, borderLeft: `4px solid ${COLORS.primary.main}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Skill Ranking Analytics
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Skill Rank Score: {skillRanking?.skill_rank_score ?? 0}/100
                </Typography>
                <LinearProgress variant="determinate" value={skillRanking?.skill_rank_score ?? 0} sx={{ height: 10, borderRadius: 2, mb: 2 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Top Matched Skills
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
                  {(skillRanking?.matched_skills || []).slice(0, 6).map((item) => (
                    <Chip key={item.skill} label={`${item.skill} (${item.demand})`} size="small" color="success" variant="outlined" />
                  ))}
                </Stack>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Skill Gaps
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {(skillRanking?.missing_skills || []).slice(0, 6).map((item) => (
                    <Chip key={item.skill} label={`${item.skill} (${item.demand})`} size="small" color="warning" variant="outlined" />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          {panel === "bidder" && (
            <Card sx={{ p: 2, borderLeft: `4px solid ${COLORS.accent.main}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Bidder Ranking Analytics
                </Typography>
                <Stack spacing={1}>
                  {(biddingRanking?.ranking || []).slice(0, 8).map((item) => (
                    <Box key={`${item.project_id}-${item.title}`}>
                      <Typography variant="caption">
                        {item.title} | bid {item.bid_score} | fit {item.skill_fit}% | prospects {item.prospects_count} | deals {item.related_deals_count}
                      </Typography>
                      <LinearProgress variant="determinate" value={Math.min(100, item.bid_score || 0)} sx={{ height: 8, borderRadius: 2 }} />
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          {panel === "sentiment" && (
            <Card sx={{ p: 2, borderLeft: `4px solid ${COLORS.secondary.main}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Sentiment Ranking Analytics
                </Typography>
                <Stack spacing={1}>
                  {(sentimentRanking?.ranking || []).slice(0, 6).map((item) => (
                    <Box key={`${item.analysis_id}-${item.deal_id}`}>
                      <Typography variant="caption">
                        {item.deal_title} - {item.sentiment} ({Math.round((item.sentiment_confidence || 0) * 100)}%) - rank {item.rank_score}
                      </Typography>
                      <LinearProgress variant="determinate" value={Math.min(100, item.rank_score || 0)} sx={{ height: 8, borderRadius: 2 }} />
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

export default Rankings;
