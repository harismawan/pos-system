/**
 * SalesTrendChart - Line/Bar chart for sales trend visualization
 * Shows revenue and order count over time with optional period comparison
 */

import React from "react";
import { Line, Bar } from "react-chartjs-2";
import "./chartConfig.js"; // Register Chart.js components
import { defaultOptions, colors } from "./chartConfig.js";

function SalesTrendChart({
  data,
  previousData = null,
  type = "line",
  showComparison = false,
  height = 300,
}) {
  if (!data || data.length === 0) {
    return (
      <div
        className="empty-state"
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p>No data available for the selected period</p>
      </div>
    );
  }

  const labels = data.map((item) => item.date);

  // Current period dataset with solid styling
  const datasets = [
    {
      label: "Current Period",
      data: data.map((item) => item.revenue),
      borderColor: "#6366f1", // Indigo - primary current period
      backgroundColor:
        type === "line"
          ? "rgba(99, 102, 241, 0.15)"
          : "rgba(99, 102, 241, 0.85)",
      fill: type === "line",
      tension: 0.4,
      borderWidth: 3,
      pointRadius: 5,
      pointHoverRadius: 8,
      pointBackgroundColor: "#6366f1",
      pointBorderColor: "#fff",
      pointBorderWidth: 2,
      order: 1, // Draw on top
    },
  ];

  // Previous period dataset with dashed/muted styling
  if (showComparison && previousData && previousData.length > 0) {
    datasets.push({
      label: "Previous Period",
      data: previousData.map((item) => item.revenue),
      borderColor: "#9ca3af", // Gray - previous period
      backgroundColor:
        type === "line"
          ? "rgba(156, 163, 175, 0.1)"
          : "rgba(156, 163, 175, 0.5)",
      fill: type === "line",
      tension: 0.4,
      borderWidth: 2,
      borderDash: [8, 4], // Dashed line for distinction
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: "#9ca3af",
      pointBorderColor: "#fff",
      pointBorderWidth: 1,
      order: 2, // Draw behind
    });
  }

  const chartData = { labels, datasets };

  const options = {
    ...defaultOptions,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      ...defaultOptions.plugins,
      legend: {
        ...defaultOptions.plugins.legend,
        labels: {
          ...defaultOptions.plugins.legend.labels,
          usePointStyle: true,
          pointStyle: "circle",
          padding: 24,
          font: {
            family: "'Inter', sans-serif",
            size: 13,
            weight: 500,
          },
          generateLabels: function (chart) {
            const datasets = chart.data.datasets;
            return datasets.map((dataset, i) => ({
              text: dataset.label,
              fillStyle: dataset.borderColor,
              strokeStyle: dataset.borderColor,
              lineWidth: dataset.borderWidth,
              lineDash: dataset.borderDash || [],
              hidden: !chart.isDatasetVisible(i),
              datasetIndex: i,
              pointStyle: "circle",
            }));
          },
        },
      },
      tooltip: {
        ...defaultOptions.plugins.tooltip,
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        titleColor: "#fff",
        bodyColor: "#e5e7eb",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        padding: 14,
        displayColors: true,
        boxPadding: 6,
        callbacks: {
          title: function (context) {
            return `📅 ${context[0].label}`;
          },
          label: function (context) {
            const value = context.parsed.y;
            const isCurrentPeriod = context.datasetIndex === 0;
            const icon = isCurrentPeriod ? "●" : "○";
            const periodLabel = isCurrentPeriod ? "Current" : "Previous";
            return `${icon} ${periodLabel}: Rp ${value.toLocaleString("id-ID")}`;
          },
          afterBody: function (context) {
            if (context.length === 2) {
              const current = context[0].parsed.y;
              const previous = context[1].parsed.y;
              const diff = current - previous;
              const percent =
                previous > 0 ? ((diff / previous) * 100).toFixed(1) : 0;
              const sign = diff >= 0 ? "+" : "";
              const emoji = diff >= 0 ? "📈" : "📉";
              return [
                ``,
                `${emoji} Change: ${sign}Rp ${diff.toLocaleString("id-ID")} (${sign}${percent}%)`,
              ];
            }
            return [];
          },
        },
      },
    },
    scales: {
      ...defaultOptions.scales,
      y: {
        ...defaultOptions.scales.y,
        grid: {
          color: "rgba(0, 0, 0, 0.04)",
          drawBorder: false,
        },
        ticks: {
          ...defaultOptions.scales.y.ticks,
          callback: function (value) {
            if (value >= 1000000) {
              return `Rp ${(value / 1000000).toFixed(1)}M`;
            }
            return `Rp ${(value / 1000).toFixed(0)}k`;
          },
        },
      },
      x: {
        ...defaultOptions.scales.x,
        grid: {
          display: false,
        },
      },
    },
  };

  const ChartComponent = type === "bar" ? Bar : Line;

  return (
    <div>
      {/* Chart Legend Info */}
      {showComparison && previousData && previousData.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "24px",
            marginBottom: "16px",
            padding: "12px 16px",
            backgroundColor: "var(--gray-50)",
            borderRadius: "var(--radius-md)",
            fontSize: "13px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "16px",
                height: "4px",
                backgroundColor: "#6366f1",
                borderRadius: "2px",
                display: "inline-block",
              }}
            />
            <span style={{ color: "var(--gray-600)", fontWeight: 500 }}>
              Current Period
            </span>
            <span style={{ color: "var(--gray-400)" }}>— solid line</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "16px",
                height: "4px",
                background:
                  "repeating-linear-gradient(90deg, #9ca3af 0, #9ca3af 4px, transparent 4px, transparent 8px)",
                borderRadius: "2px",
                display: "inline-block",
              }}
            />
            <span style={{ color: "var(--gray-600)", fontWeight: 500 }}>
              Previous Period
            </span>
            <span style={{ color: "var(--gray-400)" }}>— dashed line</span>
          </div>
        </div>
      )}

      {/* Chart */}
      <div style={{ height, position: "relative" }}>
        <ChartComponent data={chartData} options={options} />
      </div>
    </div>
  );
}

export default SalesTrendChart;
