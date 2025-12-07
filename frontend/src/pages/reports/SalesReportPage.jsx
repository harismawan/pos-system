import React, { useState, useEffect } from "react";
import * as reportsApi from "../../api/reportsApi.js";
import { useUiStore } from "../../store/uiStore.js";

function SalesReportPage() {
  const showNotification = useUiStore((state) => state.showNotification);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [groupBy, setGroupBy] = useState("day");

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );

  useEffect(() => {
    loadData();
  }, [startDate, endDate, groupBy]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await reportsApi.getSalesSummary({
        startDate,
        endDate: endDate + "T23:59:59",
        groupBy,
      });
      setSummary(result.summary);
      setChartData(result.chartData || []);
    } catch (err) {
      showNotification(err.message || "Failed to load report", "error");
    } finally {
      setLoading(false);
    }
  };

  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Report</h1>
          <p className="page-subtitle">Revenue, orders, and sales trends</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ marginBottom: "4px" }}>
            From
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ width: "160px" }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ marginBottom: "4px" }}>
            To
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ width: "160px" }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ marginBottom: "4px" }}>
            Group By
          </label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            style={{ width: "120px" }}
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px" }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }}></div>
          <p style={{ color: "var(--gray-500)" }}>Loading report...</p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="stats-grid" style={{ marginBottom: "32px" }}>
            <div className="stat-card">
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value">
                Rp {(summary?.totalRevenue || 0).toLocaleString("id-ID")}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Orders</div>
              <div className="stat-value">{summary?.totalOrders || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Items Sold</div>
              <div className="stat-value">
                {Math.round(summary?.totalItems || 0)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg Order Value</div>
              <div className="stat-value">
                Rp{" "}
                {Math.round(summary?.averageOrderValue || 0).toLocaleString(
                  "id-ID",
                )}
              </div>
            </div>
          </div>

          {/* Simple Bar Chart */}
          <div className="card" style={{ marginBottom: "32px" }}>
            <div className="card-header">
              <h2 className="card-title">Revenue Trend</h2>
            </div>
            {chartData.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "4px",
                  height: "200px",
                  padding: "20px 0",
                }}
              >
                {chartData.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        maxWidth: "40px",
                        height: `${(item.revenue / maxRevenue) * 160}px`,
                        minHeight: "4px",
                        background:
                          "linear-gradient(180deg, var(--primary-400), var(--primary-600))",
                        borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
                        transition: "height 0.3s ease",
                      }}
                      title={`Rp ${item.revenue.toLocaleString("id-ID")}`}
                    ></div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "var(--gray-500)",
                        transform: "rotate(-45deg)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.date}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: "40px" }}>
                <p>No data for selected period</p>
              </div>
            )}
          </div>

          {/* Additional Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
            }}
          >
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Tax & Discounts</h3>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <span style={{ color: "var(--gray-500)" }}>
                  Total Tax Collected
                </span>
                <span style={{ fontWeight: 600 }}>
                  Rp {(summary?.totalTax || 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--gray-500)" }}>
                  Total Discounts Given
                </span>
                <span style={{ fontWeight: 600, color: "var(--error-500)" }}>
                  -Rp {(summary?.totalDiscount || 0).toLocaleString("id-ID")}
                </span>
              </div>
            </div>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Quick Stats</h3>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <span style={{ color: "var(--gray-500)" }}>
                  Avg Items per Order
                </span>
                <span style={{ fontWeight: 600 }}>
                  {summary?.totalOrders
                    ? (summary.totalItems / summary.totalOrders).toFixed(1)
                    : 0}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--gray-500)" }}>Net Revenue</span>
                <span style={{ fontWeight: 600, color: "var(--success-600)" }}>
                  Rp{" "}
                  {(
                    (summary?.totalRevenue || 0) - (summary?.totalDiscount || 0)
                  ).toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SalesReportPage;
