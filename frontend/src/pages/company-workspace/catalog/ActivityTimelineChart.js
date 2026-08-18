import React, { useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Cumulative activity step chart — suitable for “where things stand” over time.
 * @param {{ ts: number, label: string, detail?: string, kind?: string }[]} events sorted or unsorted
 */
const ActivityTimelineChart = ({ events = [] }) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const options = useMemo(() => {
    if (!events.length) return null;
    const sorted = [...events].sort((a, b) => a.ts - b.ts);

    const isDark = theme.palette.mode === "dark";
    const grid = isDark ? "#444" : "#e0e0e0";
    const text = theme.palette.text.primary;

    return {
      chart: {
        type: "line",
        height: 360,
        zoomType: "x",
        backgroundColor: "transparent",
      },
      title: {
        text: t("companyWorkspace.catalogActivityChartTitle"),
        style: { color: text },
      },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        type: "datetime",
        gridLineColor: grid,
        labels: { style: { color: text } },
      },
      yAxis: {
        title: { text: t("companyWorkspace.catalogActivityChartY"), style: { color: text } },
        min: 0,
        allowDecimals: false,
        gridLineColor: grid,
        labels: { style: { color: text } },
      },
      tooltip: {
        useHTML: true,
        formatter() {
          const idx = Math.max(0, Math.round(this.y) - 1);
          const ev = sorted[idx];
          if (!ev) return false;
          return `<b>${ev.label}</b><br/><span style="opacity:.85">${ev.detail || new Date(ev.ts).toLocaleString()}</span>`;
        },
      },
      plotOptions: {
        line: {
          step: "left",
          marker: { enabled: true, radius: 5 },
          lineWidth: 2,
        },
        series: {
          animation: { duration: 400 },
        },
      },
      series: [
        {
          name: t("companyWorkspace.catalogActivityChartSeries"),
          data: sorted.map((e, i) => [e.ts, i + 1]),
          color: theme.palette.primary.main,
        },
      ],
    };
  }, [events, theme, t]);

  if (!options) return null;

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

export default ActivityTimelineChart;
