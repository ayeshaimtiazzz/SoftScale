import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Box,
  Chip,
  CircularProgress,
  Link,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "config";
import { ROUTES } from "../../../constants";
import {
  RankingsBidderLineChart,
  RankingsConversationVolumeLineChart,
  RankingsSentimentLineChart,
} from "../../rankings/lineCharts";

const getDealsBaseUrl = () => API_BASE.replace("/api", "");

const numericDealId = (d) => {
  let id = d.deal_id ?? d.id;
  if (typeof id === "string" && id.startsWith("deal-")) id = id.replace("deal-", "");
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
};

const CatalogRankings = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { itemType, itemId, title, token } = useOutletContext();
  const [sub, setSub] = useState(0);

  const [bidding, setBidding] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [convLoading, setConvLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loadingRank, setLoadingRank] = useState(true);

  const params = useMemo(() => {
    const base = { role: "company_admin" };
    if (itemType === "project") return { ...base, project_id: itemId };
    return { ...base, job_id: itemId };
  }, [itemType, itemId]);

  const fetchRankings = useCallback(async () => {
    if (!token) {
      setLoadingRank(false);
      return;
    }
    setLoadingRank(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [bidRes, sentRes] = await Promise.all([
        axios.get(`${API_BASE}/dashboard-bidding-ranking`, { headers, params }),
        axios.get(`${API_BASE}/dashboard-sentiment-ranking`, { headers, params }),
      ]);
      setBidding(bidRes.data);
      setSentiment(sentRes.data);
    } catch {
      setBidding(null);
      setSentiment(null);
    } finally {
      setLoadingRank(false);
    }
  }, [token, params]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const run = async () => {
      try {
        const { data } = await axios.get(`${getDealsBaseUrl()}/deals`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const list = data.deals || [];
        if (!cancelled) setDeals(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setDeals([]);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const relatedDeals = useMemo(() => {
    return deals.filter((d) => {
      if (itemType === "job") {
        const jid = d.related_job_id ?? d.relatedJobId;
        return jid != null && Number(jid) === Number(itemId);
      }
      const pid = d.related_project_id ?? d.relatedProjectId;
      return pid != null && Number(pid) === Number(itemId);
    });
  }, [deals, itemType, itemId]);

  useEffect(() => {
    if (sub !== 1 || !token || relatedDeals.length === 0) {
      setConversations([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setConvLoading(true);
      const rows = [];
      try {
        for (const d of relatedDeals.slice(0, 12)) {
          const nid = numericDealId(d);
          if (nid == null) continue;
          try {
            const { data } = await axios.get(`${API_BASE}/deals/${nid}/conversations`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const convs = data.conversations || [];
            rows.push({ deal: d, conversations: convs });
          } catch {
            /* skip deal */
          }
        }
        if (!cancelled) setConversations(rows);
      } finally {
        if (!cancelled) setConvLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [sub, token, relatedDeals]);

  const bidRows = bidding?.ranking || [];
  const sentRows = sentiment?.ranking || [];

  const conversationThreadPoints = useMemo(() => {
    const pts = [];
    conversations.forEach(({ deal, conversations: convList }) => {
      const dealLabel = (deal.dealTitle || deal.deal_title || "Deal").slice(0, 24);
      (convList || []).forEach((c) => {
        pts.push({
          label: `${dealLabel} · ${(c.title || "Thread").slice(0, 24)}`,
          count: c.message_count ?? 0,
        });
      });
    });
    return pts;
  }, [conversations]);

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {t("companyWorkspace.catalogRankingsIntro", { title: title || `#${itemId}` })}
      </Typography>
      <Tabs value={sub} onChange={(_, v) => setSub(v)} variant="fullWidth" sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tab label={t("companyWorkspace.catalogRankingsTabBidders")} sx={{ textTransform: "none", fontWeight: 600 }} />
        <Tab label={t("companyWorkspace.catalogRankingsTabConversations")} sx={{ textTransform: "none", fontWeight: 600 }} />
        <Tab label={t("companyWorkspace.catalogRankingsTabSentiment")} sx={{ textTransform: "none", fontWeight: 600 }} />
      </Tabs>

      {sub === 0 && (
        <Stack spacing={1.5}>
          {loadingRank ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : !bidRows.length ? (
            <Typography color="text.secondary">{t("companyWorkspace.catalogRankingsBiddersEmpty")}</Typography>
          ) : (
            <>
            <Box sx={{ mb: 2 }}>
              <RankingsBidderLineChart ranking={bidRows} />
            </Box>
            {bidRows.map((row, idx) => (
              <Paper key={row.project_id ?? row.job_id ?? idx} variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {row.title}
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                  <Chip size="small" label={`Bid score ${row.bid_score ?? "—"}`} color="primary" variant="outlined" />
                  <Chip size="small" label={`Skill fit ${row.skill_fit ?? "—"}%`} />
                  <Chip size="small" label={`Prospects ${row.prospects_count ?? 0}`} />
                  <Chip size="small" label={`Deals ${row.related_deals_count ?? 0}`} />
                </Stack>
              </Paper>
            ))}
            </>
          )}
        </Stack>
      )}

      {sub === 1 && (
        <Stack spacing={2}>
          {convLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : relatedDeals.length === 0 ? (
            <Typography color="text.secondary">{t("companyWorkspace.catalogRankingsNoDealsForConv")}</Typography>
          ) : conversations.length === 0 ? (
            <Typography color="text.secondary">{t("companyWorkspace.catalogRankingsConvEmpty")}</Typography>
          ) : (
            <>
            <Box sx={{ mb: 2 }}>
              <RankingsConversationVolumeLineChart threads={conversationThreadPoints} />
            </Box>
            {conversations.map(({ deal, conversations: convList }) => (
              <Paper key={numericDealId(deal) || deal.id} variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {deal.dealTitle || deal.deal_title || "Deal"}
                </Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {(convList || []).map((c) => (
                    <Stack key={c.conversation_id} spacing={0.25}>
                      <Typography variant="body2">
                        {c.title || "Thread"} — {c.message_count ?? 0} messages
                      </Typography>
                      {c.last_message_preview && (
                        <Typography variant="caption" color="text.secondary">
                          {c.last_message_preview}
                        </Typography>
                      )}
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            ))}
            </>
          )}
        </Stack>
      )}

      {sub === 2 && (
        <Stack spacing={1.5}>
          {loadingRank ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : !sentRows.length ? (
            <Typography color="text.secondary">{t("companyWorkspace.catalogRankingsSentimentEmpty")}</Typography>
          ) : (
            <>
            <Box sx={{ mb: 2 }}>
              <RankingsSentimentLineChart ranking={sentRows} />
            </Box>
            {sentRows.map((row) => (
              <Paper key={row.analysis_id || row.deal_id} variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {row.deal_title}
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                  <Chip size="small" label={row.sentiment || "—"} color="secondary" variant="outlined" />
                  <Chip
                    size="small"
                    label={`${t("companyWorkspace.catalogRankingsConfidence")}: ${Math.round((row.sentiment_confidence || 0) * 100)}%`}
                  />
                  <Chip size="small" label={`Rank ${row.rank_score ?? "—"}`} />
                </Stack>
                {row.created_at && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                    {new Date(row.created_at).toLocaleString()}
                  </Typography>
                )}
              </Paper>
            ))}
            </>
          )}
        </Stack>
      )}

      <Typography variant="caption" color="text.secondary">
        {t("companyWorkspace.catalogRankingsFooter")}{" "}
        <Link component="button" type="button" onClick={() => navigate(ROUTES.RANKINGS)} sx={{ cursor: "pointer" }}>
          {t("companyWorkspace.catalogRankingsOpenGlobal")}
        </Link>
      </Typography>
    </Stack>
  );
};

export default CatalogRankings;
