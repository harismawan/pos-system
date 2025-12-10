import React, { useState, useEffect } from "react";
import * as reportsApi from "../../api/reportsApi.js";
import { useUiStore } from "../../store/uiStore.js";
import {
  SalesTrendChart,
  PeriodComparison,
} from "../../components/charts/index.js";

function SalesReportPage() {
  const showNotification = useUiStore((state) => state.showNotification);

  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState(null);
  const [groupBy, setGroupBy] = useState("day");
  const [chartType, setChartType] = useState("line");

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

      // Load sales trend with comparison (single API call)
      const trendResult = await reportsApi.getSalesTrend({
        startDate,
        endDate: endDate + "T23:59:59",
        groupBy,
        compareWithPrevious: true,
      });
      setTrendData(trendResult);
    } catch (err) {
      // Error handled centrally
    } finally {
      setLoading(false);
    }
  };

  const currentTotals = trendData?.current?.totals;

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
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ marginBottom: "4px" }}>
            Chart
          </label>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            style={{ width: "100px" }}
          >
            <option value="line">Line</option>
            <option value="bar">Bar</option>
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
          {/* Stats Cards with Comparison */}
          <div style={{ marginBottom: "24px" }}>
            <PeriodComparison
              current={currentTotals}
              previous={trendData?.previous?.totals}
              comparison={trendData?.comparison}
              showComparison={!!trendData?.comparison}
            />
          </div>

          {/* Chart.js Revenue Trend */}
          <div className="card" style={{ marginBottom: "32px" }}>
            <div className="card-header">
              <h2 className="card-title">Revenue Trend</h2>
            </div>
            <div style={{ padding: "16px" }}>
              <SalesTrendChart
                data={trendData?.current?.data || []}
                previousData={trendData?.previous?.data}
                type={chartType}
                showComparison={trendData?.previous?.data?.length > 0}
                height={300}
              />
            </div>
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
                  Rp {(currentTotals?.totalTax || 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--gray-500)" }}>
                  Total Discounts Given
                </span>
                <span style={{ fontWeight: 600, color: "var(--error-500)" }}>
                  -Rp{" "}
                  {(currentTotals?.totalDiscount || 0).toLocaleString("id-ID")}
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
                  {(currentTotals?.avgItemsPerOrder || 0).toFixed(1)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--gray-500)" }}>Net Revenue</span>
                <span style={{ fontWeight: 600, color: "var(--success-600)" }}>
                  Rp {(currentTotals?.netRevenue || 0).toLocaleString("id-ID")}
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
