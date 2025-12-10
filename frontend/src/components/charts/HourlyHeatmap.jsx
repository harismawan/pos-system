/**
 * HourlyHeatmap - Grid visualization showing sales by hour and day of week
 * Color intensity represents transaction volume
 */

import React from "react";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function HourlyHeatmap({
  data,
  dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
}) {
  if (!data || !data.heatmap) {
    return (
      <div className="empty-state" style={{ padding: "40px" }}>
        <p>No heatmap data available</p>
      </div>
    );
  }

  const { heatmap, peakHour, totalOrders } = data;

  // Find max value for color scaling
  let maxOrders = 0;
  heatmap.forEach((day) => {
    day.forEach((slot) => {
      if (slot.orders > maxOrders) maxOrders = slot.orders;
    });
  });

  // Get color intensity based on value
  const getColor = (orders) => {
    if (orders === 0) return "var(--gray-100)";
    const intensity = Math.min(orders / maxOrders, 1);
    const alpha = 0.2 + intensity * 0.8;
    return `rgba(99, 102, 241, ${alpha})`;
  };

  // Format hour
  const formatHour = (hour) => {
    if (hour === 0) return "12a";
    if (hour === 12) return "12p";
    if (hour < 12) return `${hour}a`;
    return `${hour - 12}p`;
  };

  return (
    <div className="heatmap-container">
      <div className="heatmap-header">
        {peakHour && peakHour.orders > 0 && (
          <div className="peak-hour-badge">
            <span className="peak-icon">🔥</span>
            Peak: {peakHour.day} {peakHour.hour}:00 ({peakHour.orders} orders)
          </div>
        )}
        <div className="total-orders">
          Total: {totalOrders.toLocaleString()} orders
        </div>
      </div>

      <div className="heatmap-grid" style={{ overflowX: "auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `60px repeat(24, 1fr)`,
            gap: "2px",
            minWidth: "600px",
          }}
        >
          {/* Header row with hours */}
          <div style={{ height: "24px" }}></div>
          {HOURS.map((hour) => (
            <div
              key={`hour-${hour}`}
              style={{
                fontSize: "10px",
                textAlign: "center",
                color: "var(--gray-500)",
              }}
            >
              {formatHour(hour)}
            </div>
          ))}

          {/* Data rows */}
          {dayNames.map((day, dayIndex) => (
            <React.Fragment key={day}>
              <div
                style={{
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  color: "var(--gray-600)",
                  fontWeight: 500,
                }}
              >
                {day}
              </div>
              {HOURS.map((hour) => {
                const slot = heatmap[dayIndex][hour];
                return (
                  <div
                    key={`${day}-${hour}`}
                    style={{
                      backgroundColor: getColor(slot.orders),
                      height: "28px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                    title={`${day} ${hour}:00 - ${slot.orders} orders, Rp ${slot.revenue.toLocaleString("id-ID")}`}
                    onMouseEnter={(e) => {
                      e.target.style.transform = "scale(1.1)";
                      e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
                      e.target.style.zIndex = "10";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = "scale(1)";
                      e.target.style.boxShadow = "none";
                      e.target.style.zIndex = "1";
                    }}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginTop: "16px",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: "11px", color: "var(--gray-500)" }}>Less</span>
        {[0.1, 0.3, 0.5, 0.7, 0.9].map((intensity) => (
          <div
            key={intensity}
            style={{
              width: "20px",
              height: "12px",
              backgroundColor: `rgba(99, 102, 241, ${0.2 + intensity * 0.8})`,
              borderRadius: "2px",
            }}
          />
        ))}
        <span style={{ fontSize: "11px", color: "var(--gray-500)" }}>More</span>
      </div>
    </div>
  );
}

export default HourlyHeatmap;
