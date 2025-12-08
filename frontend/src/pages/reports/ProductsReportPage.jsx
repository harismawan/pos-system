import React, { useState, useEffect, useMemo } from "react";
import DataTable from "react-data-table-component";
import * as reportsApi from "../../api/reportsApi.js";
import { useUiStore } from "../../store/uiStore.js";

const customStyles = {
  headRow: {
    style: {
      backgroundColor: "var(--gray-50)",
      borderBottom: "2px solid var(--gray-200)",
      minHeight: "52px",
    },
  },
  headCells: {
    style: {
      fontSize: "13px",
      fontWeight: "600",
      color: "var(--gray-600)",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
    },
  },
  rows: {
    style: {
      minHeight: "56px",
      fontSize: "14px",
    },
  },
};

function ProductsReportPage() {
  const showNotification = useUiStore((state) => state.showNotification);

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [sortBy, setSortBy] = useState("revenue");
  const [limit, setLimit] = useState(20);

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
  }, [startDate, endDate, sortBy, limit]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await reportsApi.getTopProducts({
        startDate,
        endDate: endDate + "T23:59:59",
        sortBy,
        limit,
      });
      setProducts(result.products || []);
    } catch (err) {
      // Error handled centrally
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = products.reduce((sum, p) => sum + p.totalRevenue, 0);
  const totalQuantity = products.reduce((sum, p) => sum + p.totalQuantity, 0);

  const columns = useMemo(
    () => [
      {
        name: "Rank",
        width: "70px",
        cell: (row, index) => (
          <span
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "var(--radius-full)",
              background: index < 3 ? "var(--warning-500)" : "var(--gray-200)",
              color: index < 3 ? "white" : "var(--gray-600)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            {index + 1}
          </span>
        ),
      },
      {
        name: "Product",
        cell: (row) => (
          <div>
            <div style={{ fontWeight: 500 }}>{row.product.name}</div>
            <div style={{ fontSize: "12px", color: "var(--gray-400)" }}>
              {row.product.sku}
            </div>
          </div>
        ),
      },
      {
        name: "Category",
        selector: (row) => row.product.category || "-",
        width: "140px",
      },
      {
        name: "Qty Sold",
        selector: (row) => row.totalQuantity,
        sortable: true,
        width: "120px",
        cell: (row) => Math.round(row.totalQuantity),
      },
      {
        name: "Orders",
        selector: (row) => row.orderCount,
        width: "100px",
      },
      {
        name: "Revenue",
        selector: (row) => row.totalRevenue,
        sortable: true,
        width: "150px",
        cell: (row) => (
          <div style={{ fontWeight: 600 }}>
            Rp {row.totalRevenue.toLocaleString("id-ID")}
          </div>
        ),
      },
      {
        name: "% of Total",
        width: "120px",
        cell: (row) => (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "40px",
                height: "6px",
                background: "var(--gray-200)",
                borderRadius: "var(--radius-full)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${(row.totalRevenue / totalRevenue) * 100}%`,
                  height: "100%",
                  background: "var(--primary-500)",
                }}
              ></div>
            </div>
            <span style={{ fontSize: "12px", color: "var(--gray-500)" }}>
              {((row.totalRevenue / totalRevenue) * 100).toFixed(1)}%
            </span>
          </div>
        ),
      },
    ],
    [totalRevenue],
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Products Report</h1>
          <p className="page-subtitle">Best selling products and performance</p>
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
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ width: "130px" }}
          >
            <option value="revenue">Revenue</option>
            <option value="quantity">Quantity</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ marginBottom: "4px" }}>
            Show Top
          </label>
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            style={{ width: "100px" }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: "24px" }}>
        <div className="stat-card">
          <div className="stat-label">Products Sold</div>
          <div className="stat-value">{products.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Quantity</div>
          <div className="stat-value">{Math.round(totalQuantity)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">
            Rp {totalRevenue.toLocaleString("id-ID")}
          </div>
        </div>
      </div>

      <div className="data-table-container">
        <DataTable
          columns={columns}
          data={products}
          progressPending={loading}
          customStyles={customStyles}
          noDataComponent={
            <div className="empty-state">
              <div className="empty-state-icon">🏆</div>
              <div className="empty-state-title">No product data</div>
              <p>No sales in the selected period</p>
            </div>
          }
        />
      </div>
    </div>
  );
}

export default ProductsReportPage;
