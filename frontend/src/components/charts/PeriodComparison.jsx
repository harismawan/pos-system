/**
 * PeriodComparison - Shows comparison between current and previous period
 * Displays key metrics with percentage change indicators and previous values
 * Can also be used as simple stats display when showComparison is false
 */

import React from "react";

function PeriodComparison({
  current,
  previous,
  comparison,
  showComparison = true,
}) {
  if (!current) {
    return null;
  }

  const hasComparison = showComparison && comparison && previous;

  const metrics = [
    {
      label: "Revenue",
      icon: "💰",
      current: current.revenue,
      previous: previous?.revenue || 0,
      change: comparison?.revenueChange || 0,
      format: (v) => `Rp ${v.toLocaleString("id-ID")}`,
      formatShort: (v) => {
        if (v >= 1000000) return `Rp ${(v / 1000000).toFixed(1)}M`;
        if (v >= 1000) return `Rp ${(v / 1000).toFixed(0)}k`;
        return `Rp ${v.toLocaleString("id-ID")}`;
      },
    },
    {
      label: "Orders",
      icon: "📦",
      current: current.orders,
      previous: previous?.orders || 0,
      change: comparison?.ordersChange || 0,
      format: (v) => v.toLocaleString(),
      formatShort: (v) => v.toLocaleString(),
    },
    {
      label: "Items Sold",
      icon: "🛒",
      current: current.items,
      previous: previous?.items || 0,
      change: comparison?.itemsChange || 0,
      format: (v) => Math.round(v).toLocaleString(),
      formatShort: (v) => Math.round(v).toLocaleString(),
    },
    {
      label: "Avg Order Value",
      icon: "📊",
      current:
        current.avgOrderValue ||
        (current.orders > 0 ? current.revenue / current.orders : 0),
      previous: previous?.avgOrderValue || 0,
      change: comparison?.avgOrderValueChange || 0,
      format: (v) => `Rp ${Math.round(v).toLocaleString("id-ID")}`,
      formatShort: (v) => {
        if (v >= 1000000) return `Rp ${(v / 1000000).toFixed(1)}M`;
        if (v >= 1000) return `Rp ${Math.round(v / 1000)}k`;
        return `Rp ${Math.round(v).toLocaleString("id-ID")}`;
      },
    },
  ];

  // Calculate the difference
  const getDiff = (metric) => {
    return metric.current - metric.previous;
  };

  return (
    <div className="period-comparison">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
        }}
      >
        {metrics.map((metric) => {
          const diff = getDiff(metric);
          const isPositive = metric.change > 0;
          const isNegative = metric.change < 0;

          return (
            <div
              key={metric.label}
              className="comparison-card"
              style={{
                padding: "20px",
                backgroundColor: "white",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--gray-100)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {/* Header with icon and label */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                <span style={{ fontSize: "20px" }}>{metric.icon}</span>
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--gray-500)",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {metric.label}
                </span>
              </div>

              {/* Current value - large */}
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "var(--gray-900)",
                  marginBottom: hasComparison ? "12px" : "0",
                  lineHeight: 1.2,
                }}
              >
                {metric.format(metric.current)}
              </div>

              {/* Change badge - only show if comparison is enabled */}
              {hasComparison && (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "12px",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "4px 10px",
                        borderRadius: "16px",
                        fontSize: "13px",
                        fontWeight: 600,
                        backgroundColor: isPositive
                          ? "rgba(16, 185, 129, 0.1)"
                          : isNegative
                            ? "rgba(239, 68, 68, 0.1)"
                            : "var(--gray-100)",
                        color: isPositive
                          ? "#059669"
                          : isNegative
                            ? "#dc2626"
                            : "var(--gray-600)",
                      }}
                    >
                      {isPositive ? "▲" : isNegative ? "▼" : "●"}{" "}
                      {Math.abs(metric.change).toFixed(1)}%
                    </span>
                    <span
                      style={{ fontSize: "11px", color: "var(--gray-400)" }}
                    >
                      vs previous
                    </span>
                  </div>

                  {/* Previous period detail */}
                  <div
                    style={{
                      padding: "10px 12px",
                      backgroundColor: "var(--gray-50)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "6px",
                      }}
                    >
                      <span style={{ color: "var(--gray-500)" }}>Previous</span>
                      <span
                        style={{ fontWeight: 500, color: "var(--gray-600)" }}
                      >
                        {metric.formatShort(metric.previous)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ color: "var(--gray-500)" }}>
                        Difference
                      </span>
                      <span
                        style={{
                          fontWeight: 600,
                          color: isPositive
                            ? "#059669"
                            : isNegative
                              ? "#dc2626"
                              : "var(--gray-600)",
                        }}
                      >
                        {diff >= 0 ? "+" : ""}
                        {metric.formatShort(diff)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PeriodComparison;
