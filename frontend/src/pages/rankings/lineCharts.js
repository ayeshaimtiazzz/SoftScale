import React, { useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { useTheme } from "@mui/material/styles";

const baseChart = (theme, isDark) => ({
  credits: { enabled: false },
  chart: { backgroundColor: "transparent" },
  legend: { itemStyle: { color: theme.palette.text.primary } },
  xAxis: {
    gridLineColor: isDark ? "#444" : "#e0e0e0",
    labels: { style: { color: theme.palette.text.secondary } },
  },
  yAxis: {
    gridLineColor: isDark ? "#444" : "#e0e0e0",
    labels: { style: { color: theme.palette.text.secondary } },
    title: { style: { color: theme.palette.text.secondary } },
  },
});

/** User panel — three pillars as a connected line (skill / bidder / sentiment inputs). */
export function RankingsCompositeLineChart({ skillScore = 0, bidderAvg = 0, sentimentAvg = 0 }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const options = useMemo(
    () => ({
      ...baseChart(theme, isDark),
      chart: { type: "line", height: 320, backgroundColor: "transparent" },
      title: { text: "Composite inputs (0–100 scale)", style: { color: theme.palette.text.primary } },
      xAxis: {
        ...baseChart(theme, isDark).xAxis,
        categories: ["Skill rank", "Bidder pulse", "Sentiment pulse"],
      },
      yAxis: {
        ...baseChart(theme, isDark).yAxis,
        title: { text: "Score" },
        min: 0,
        max: 100,
      },
      tooltip: { shared: true },
      plotOptions: {
        line: { marker: { enabled: true, radius: 6 }, lineWidth: 2 },
      },
      series: [
        {
          name: "Contribution",
          data: [
            Math.min(100, Number(skillScore) || 0),
            Math.min(100, Number(bidderAvg) || 0),
            Math.min(100, Number(sentimentAvg) || 0),
          ],
          color: theme.palette.info.main,
        },
      ],
    }),
    [theme, isDark, skillScore, bidderAvg, sentimentAvg]
  );
  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

/** Skills panel — demand trend across matched (and optional gap) skills. */
export function RankingsSkillDemandLineChart({ matchedSkills = [], missingSkills = [] }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const options = useMemo(() => {
    const m = (matchedSkills || []).slice(0, 12);
    const g = (missingSkills || []).slice(0, 12);
    const cat = [
      ...m.map((x) => (String(x.skill || "").length > 14 ? `${String(x.skill).slice(0, 14)}…` : x.skill)),
      ...g.map((x) => (String(x.skill || "").length > 14 ? `${String(x.skill).slice(0, 14)}…` : x.skill)),
    ];
    if (!cat.length) {
      return {
        ...baseChart(theme, isDark),
        chart: { type: "line", height: 280, backgroundColor: "transparent" },
        title: { text: "No skill demand data yet", style: { color: theme.palette.text.secondary } },
        xAxis: { categories: ["—"] },
        yAxis: { title: { text: "Demand" }, min: 0 },
        series: [{ name: "Demand", data: [0], color: theme.palette.divider }],
      };
    }

    const dataMatched = [...m.map((x) => x.demand ?? 0), ...Array(g.length).fill(null)];
    const dataGap = [...Array(m.length).fill(null), ...g.map((x) => x.demand ?? 0)];

    return {
      ...baseChart(theme, isDark),
      chart: { type: "line", height: 340, backgroundColor: "transparent" },
      title: { text: "Skill demand (market signal)", style: { color: theme.palette.text.primary } },
      xAxis: {
        ...baseChart(theme, isDark).xAxis,
        categories: cat.length ? cat : ["—"],
        labels: { rotation: -35 },
      },
      yAxis: {
        ...baseChart(theme, isDark).yAxis,
        title: { text: "Demand count" },
        min: 0,
        allowDecimals: false,
      },
      tooltip: { shared: true },
      plotOptions: { line: { marker: { enabled: true, radius: 4 } } },
      series: [
        {
          name: "Matched skills",
          data: cat.length ? dataMatched : [0],
          color: theme.palette.success.main,
          connectNulls: false,
        },
        {
          name: "Gap skills",
          data: cat.length ? dataGap : [],
          color: theme.palette.warning.main,
          connectNulls: false,
        },
      ],
    };
  }, [theme, isDark, matchedSkills, missingSkills]);

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

/** Bidder panel — bid score & skill fit vs ranked projects. */
export function RankingsBidderLineChart({ ranking = [] }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const options = useMemo(() => {
    const rows = (ranking || []).slice(0, 12);
    const categories = rows.map((r, i) => {
      const t = r.title || r.project_title || `Project ${i + 1}`;
      return t.length > 18 ? `${t.slice(0, 18)}…` : t;
    });
    const bidScores = rows.map((r) => Math.min(100, Number(r.bid_score) || 0));
    const skillFit = rows.map((r) => Math.min(100, Number(r.skill_fit) || 0));

    return {
      ...baseChart(theme, isDark),
      chart: { type: "line", height: 380, backgroundColor: "transparent" },
      title: { text: "Bid competitiveness & skill fit", style: { color: theme.palette.text.primary } },
      xAxis: {
        ...baseChart(theme, isDark).xAxis,
        categories: categories.length ? categories : ["—"],
        labels: { rotation: -35 },
      },
      yAxis: {
        ...baseChart(theme, isDark).yAxis,
        title: { text: "Score" },
        min: 0,
        max: 100,
      },
      tooltip: { shared: true },
      plotOptions: { line: { marker: { enabled: true, radius: 4 } } },
      series: [
        { name: "Bid score", data: bidScores.length ? bidScores : [0], color: theme.palette.primary.main },
        { name: "Skill fit %", data: skillFit.length ? skillFit : [0], color: theme.palette.success.main },
      ],
    };
  }, [theme, isDark, ranking]);

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

/** Sentiment panel — rank score & confidence along ranked deals. */
export function RankingsSentimentLineChart({ ranking = [] }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const options = useMemo(() => {
    const rows = (ranking || []).slice(0, 12);
    const categories = rows.map((r, i) => {
      const t = r.deal_title || `Deal ${i + 1}`;
      return t.length > 20 ? `${t.slice(0, 20)}…` : t;
    });
    const rankScores = rows.map((r) => Math.min(100, Number(r.rank_score) || 0));
    const conf = rows.map((r) => Math.round((Number(r.sentiment_confidence) || 0) * 100));

    return {
      ...baseChart(theme, isDark),
      chart: { type: "line", height: 380, backgroundColor: "transparent" },
      title: { text: "Sentiment rank score & model confidence", style: { color: theme.palette.text.primary } },
      xAxis: {
        ...baseChart(theme, isDark).xAxis,
        categories: categories.length ? categories : ["—"],
        labels: { rotation: -35 },
      },
      yAxis: {
        ...baseChart(theme, isDark).yAxis,
        title: { text: "Score / %" },
        min: 0,
        max: 100,
      },
      tooltip: { shared: true },
      plotOptions: { line: { marker: { enabled: true, radius: 4 } } },
      series: [
        { name: "Rank score", data: rankScores.length ? rankScores : [0], color: theme.palette.secondary.main },
        { name: "Confidence %", data: conf.length ? conf : [0], color: theme.palette.info.main },
      ],
    };
  }, [theme, isDark, ranking]);

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

/** Conversation threads — message volume per thread (catalog rankings). */
export function RankingsConversationVolumeLineChart({ threads = [] }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const options = useMemo(() => {
    const rows = threads || [];
    const categories = rows.map((r, i) => {
      const lab = r.label || `Thread ${i + 1}`;
      return lab.length > 22 ? `${lab.slice(0, 22)}…` : lab;
    });
    const counts = rows.map((r) => Number(r.count) || 0);

    if (!rows.length) {
      return {
        ...baseChart(theme, isDark),
        chart: { type: "line", height: 260, backgroundColor: "transparent" },
        title: { text: "No conversation threads to plot", style: { color: theme.palette.text.secondary } },
        series: [{ name: "Messages", data: [0], color: theme.palette.divider }],
        xAxis: { categories: ["—"] },
      };
    }

    return {
      ...baseChart(theme, isDark),
      chart: { type: "line", height: 320, backgroundColor: "transparent" },
      title: { text: "Message volume by thread", style: { color: theme.palette.text.primary } },
      xAxis: {
        ...baseChart(theme, isDark).xAxis,
        categories,
        labels: { rotation: -35 },
      },
      yAxis: {
        ...baseChart(theme, isDark).yAxis,
        title: { text: "Messages" },
        min: 0,
        allowDecimals: false,
      },
      tooltip: { shared: true },
      plotOptions: { line: { marker: { enabled: true, radius: 4 } } },
      series: [{ name: "Messages", data: counts, color: theme.palette.primary.main }],
    };
  }, [theme, isDark, threads]);

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}
