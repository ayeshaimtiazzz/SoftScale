import React, { useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Box, Typography, useTheme } from "@mui/material";
import { COLORS } from "../../constants";

const truncate = (s, n = 28) => {
  const t = String(s || "").trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
};

const baseChartOptions = (theme, titleText) => ({
  chart: {
    backgroundColor: "transparent",
    height: 280,
    style: { fontFamily: theme.typography.fontFamily },
  },
  title: { text: titleText, style: { color: theme.palette.text.primary, fontSize: "14px", fontWeight: 600 } },
  credits: { enabled: false },
  legend: { enabled: false },
});

/**
 * Column chart for bidding / competitiveness ranking rows (project or fallback shape).
 */
export const BiddingRankingBarChart = ({ rows = [], title }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const options = useMemo(() => {
    const slice = (rows || []).slice(0, 10);
    if (!slice.length) return null;
    const categories = slice.map((r) => truncate(r.title || r.project_title || "—", 22));
    const data = slice.map((r) => Number(r.bid_score ?? r.competitiveness ?? 0));

    return {
      ...baseChartOptions(theme, title || "Bidding competitiveness"),
      xAxis: {
        categories,
        labels: { style: { color: theme.palette.text.secondary, fontSize: "10px" }, rotation: -35 },
        lineColor: isDark ? "#555" : "#ccc",
      },
      yAxis: {
        min: 0,
        title: { text: "Score", style: { color: theme.palette.text.secondary } },
        gridLineColor: isDark ? "#444" : "#eee",
        labels: { style: { color: theme.palette.text.secondary } },
      },
      tooltip: {
        useHTML: true,
        formatter: function () {
          const p = this.point;
          return `<b>${this.x}</b><br/>Score: <b>${p.y}</b><br/>Skill fit: ${p.skillFit ?? "—"}% · Prospects: ${p.prospects} · Deals: ${p.deals}`;
        },
      },
      plotOptions: {
        column: {
          borderRadius: 3,
          colorByPoint: true,
          colors: [COLORS.primary.main, COLORS.success.main, COLORS.info.main, COLORS.accent.main, COLORS.secondary.main],
        },
      },
      series: [
        {
          type: "column",
          name: "Score",
          data: slice.map((r, i) => ({
            y: data[i],
            skillFit: r.skill_fit ?? r.skillFit,
            prospects: r.prospects_count ?? "—",
            deals: r.related_deals_count ?? "—",
          })),
        },
      ],
    };
  }, [rows, theme, title, isDark]);

  if (!options) {
    return (
      <Box sx={{ py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No bidding ranking data to chart yet.
        </Typography>
      </Box>
    );
  }

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

/**
 * Column chart for sentiment ranking (rank_score by deal).
 */
export const SentimentRankingColumnChart = ({ rows = [], title }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const options = useMemo(() => {
    const slice = (rows || []).slice(0, 10);
    if (!slice.length) return null;
    const categories = slice.map((r) => truncate(r.deal_title || "Deal", 22));
    const sentimentColor = (label) => {
      const s = String(label || "").toLowerCase();
      if (s.includes("positive")) return COLORS.success.main;
      if (s.includes("negative")) return theme.palette.error.main;
      return COLORS.info.main;
    };

    return {
      ...baseChartOptions(theme, title || "Sentiment rank scores"),
      xAxis: {
        categories,
        labels: { style: { color: theme.palette.text.secondary, fontSize: "10px" }, rotation: -35 },
        lineColor: isDark ? "#555" : "#ccc",
      },
      yAxis: {
        min: 0,
        title: { text: "Rank score", style: { color: theme.palette.text.secondary } },
        gridLineColor: isDark ? "#444" : "#eee",
        labels: { style: { color: theme.palette.text.secondary } },
      },
      tooltip: {
        formatter: function () {
          const p = this.point;
          return `<b>${this.x}</b><br/>${p.sentiment} (${p.conf}%)<br/>Rank score: <b>${p.y}</b>`;
        },
      },
      plotOptions: {
        column: {
          borderRadius: 3,
          dataLabels: { enabled: false },
        },
      },
      series: [
        {
          type: "column",
          name: "Rank",
          data: slice.map((r) => ({
            y: Number(r.rank_score ?? 0),
            sentiment: r.sentiment || "—",
            conf: Math.round((r.sentiment_confidence || 0) * 100),
            color: sentimentColor(r.sentiment),
          })),
        },
      ],
    };
  }, [rows, theme, title, isDark]);

  if (!options) {
    return (
      <Box sx={{ py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No sentiment analyses to chart yet.
        </Typography>
      </Box>
    );
  }

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

/**
 * Horizontal bar: matched vs missing skills (demand-weighted).
 */
export const SkillDemandBarChart = ({ matched = [], missing = [], title }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const options = useMemo(() => {
    const m = (matched || []).slice(0, 6);
    const x = (missing || []).slice(0, 6);
    if (!m.length && !x.length) return null;

    const categories = [...new Set([...m.map((i) => i.skill), ...x.map((i) => i.skill)])].filter(Boolean).slice(0, 12);

    const matchedMap = Object.fromEntries(m.map((i) => [i.skill, i.count ?? i.demand ?? 0]));
    const missingMap = Object.fromEntries(x.map((i) => [i.skill, i.count ?? i.demand ?? 0]));

    const have = categories.map((sk) => matchedMap[sk] || 0);
    const need = categories.map((sk) => missingMap[sk] || 0);

    return {
      chart: {
        type: "bar",
        backgroundColor: "transparent",
        height: Math.max(220, categories.length * 28),
        style: { fontFamily: theme.typography.fontFamily },
      },
      title: {
        text: title || "Skill demand: have vs gap",
        style: { color: theme.palette.text.primary, fontSize: "14px", fontWeight: 600 },
      },
      credits: { enabled: false },
      xAxis: {
        categories,
        title: { text: null },
        labels: { style: { color: theme.palette.text.secondary, fontSize: "11px" } },
      },
      yAxis: {
        min: 0,
        title: { text: "Lead mentions", style: { color: theme.palette.text.secondary } },
        gridLineColor: isDark ? "#444" : "#eee",
      },
      legend: { enabled: true, itemStyle: { color: theme.palette.text.primary } },
      plotOptions: { series: { borderRadius: 2 } },
      series: [
        { type: "bar", name: "Your skills (demand)", data: have, color: COLORS.success.main },
        { type: "bar", name: "Gap (demand)", data: need, color: COLORS.accent.main },
      ],
    };
  }, [matched, missing, theme, title, isDark]);

  if (!options) {
    return (
      <Box sx={{ py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No skill demand breakdown yet.
        </Typography>
      </Box>
    );
  }

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};
