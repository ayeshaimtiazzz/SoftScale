import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Box, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineItem,
  TimelineSeparator,
} from "@mui/lab";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { API_BASE } from "config";
import { COLORS } from "../../../constants";
import ActivityTimelineChart from "./ActivityTimelineChart";

const getDealsBaseUrl = () => API_BASE.replace("/api", "");

const CatalogDealsActivity = () => {
  const { t } = useTranslation();
  const { itemType, itemId, profileData, token } = useOutletContext();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${getDealsBaseUrl()}/deals`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const list = data.deals || [];
        if (!cancelled) setDeals(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setDeals([]);
      } finally {
        if (!cancelled) setLoading(false);
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

  const timelineEvents = useMemo(() => {
    const events = [];
    const created =
      profileData?.created_at || profileData?.createdAt || profileData?.posted_at || profileData?.postedAt;
    if (created) {
      const ts = new Date(created).getTime();
      events.push({
        id: "posted",
        label: t("companyWorkspace.catalogActivityPosted"),
        detail: new Date(created).toLocaleString(),
        ts,
        kind: "post",
      });
    }
    relatedDeals.forEach((d) => {
      const id = d.deal_id ?? d.id;
      const titleText = d.dealTitle || d.deal_title || `Deal ${id}`;
      const cAt = d.created_at || d.createdAt;
      if (cAt) {
        const ts = new Date(cAt).getTime();
        events.push({
          id: `deal-${id}-created`,
          label: t("companyWorkspace.catalogActivityDealCreated", { title: titleText }),
          detail: new Date(cAt).toLocaleString(),
          ts,
          kind: "deal",
          stage: d.stage,
          status: d.status,
        });
      }
      const upd = d.updated_at || d.updatedAt;
      const cRaw = d.created_at || d.createdAt;
      if (upd && String(upd) !== String(cRaw)) {
        const ts = new Date(upd).getTime();
        events.push({
          id: `deal-${id}-updated`,
          label: t("companyWorkspace.catalogActivityDealUpdated", { title: titleText }),
          detail: new Date(upd).toLocaleString(),
          ts,
          kind: "deal",
          stage: d.stage,
          status: d.status,
        });
      }
    });
    events.sort((a, b) => a.ts - b.ts);
    return events;
  }, [relatedDeals, profileData, t]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {t("companyWorkspace.catalogActivityDealsSummary", { count: relatedDeals.length })}
      </Typography>
      {relatedDeals.length > 0 && (
        <Stack spacing={1}>
          {relatedDeals.map((d) => (
            <Stack
              key={d.id || d.deal_id}
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              sx={{ py: 0.5 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {d.dealTitle || d.deal_title || "Deal"}
              </Typography>
              {d.stage && <Chip size="small" label={d.stage} color="primary" variant="outlined" />}
              {d.status && (
                <Chip
                  size="small"
                  label={d.status}
                  sx={{ bgcolor: `${COLORS.info.main}18` }}
                />
              )}
              {d.talentName || d.talent_name ? (
                <Typography variant="caption" color="text.secondary">
                  {d.talentName || d.talent_name}
                </Typography>
              ) : null}
            </Stack>
          ))}
        </Stack>
      )}

      <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
        {t("companyWorkspace.catalogActivityTimeline")}
      </Typography>
      {timelineEvents.length === 0 ? (
        <Typography color="text.secondary">{t("companyWorkspace.catalogActivityEmpty")}</Typography>
      ) : (
        <Stack spacing={2}>
          <ActivityTimelineChart events={timelineEvents} />
          <Typography variant="caption" color="text.secondary">
            {t("companyWorkspace.catalogActivityChartHint")}
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>
            {t("companyWorkspace.catalogActivityEventListHeading")}
          </Typography>
          <Timeline position="right">
            {timelineEvents.map((ev) => (
              <TimelineItem key={ev.id}>
                <TimelineSeparator>
                  <TimelineDot color={ev.kind === "post" ? "success" : "primary"} variant="outlined" />
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {ev.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {ev.detail}
                  </Typography>
                  {ev.stage && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      {ev.stage}
                      {ev.status ? ` · ${ev.status}` : ""}
                    </Typography>
                  )}
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </Stack>
      )}
    </Stack>
  );
};

export default CatalogDealsActivity;
