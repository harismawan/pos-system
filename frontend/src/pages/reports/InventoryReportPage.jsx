import React, { useState, useEffect, useMemo } from "react";
import DataTable from "react-data-table-component";
import * as reportsApi from "../../api/reportsApi.js";
import * as warehousesApi from "../../api/warehousesApi.js";
import { useUiStore } from "../../store/uiStore.js";
import InventoryDetailModal from "../../components/inventory/InventoryDetailModal.jsx";

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

function InventoryReportPage() {
  const showNotification = useUiStore((state) => state.showNotification);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleRowClick = (row) => {
    // Map report item structure to modal expected structure
    const modalItem = {
      ...row,
      quantityOnHand: row.quantity,
    };
    setSelectedItem(modalItem);
    setShowDetailModal(true);
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    loadData();
  }, [warehouseFilter]);

  const loadWarehouses = async () => {
    try {
      const result = await warehousesApi.getWarehouses({ limit: 100 });
      setWarehouses(result.warehouses || []);
    } catch (err) {
      console.error("Failed to load warehouses", err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (warehouseFilter) params.warehouseId = warehouseFilter;

      const result = await reportsApi.getInventoryValuation(params);
      setSummary(result.summary);
      setItems(result.items || []);
    } catch (err) {
      showNotification(err.message || "Failed to load report", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = showLowStock
    ? items.filter((i) => i.isLowStock)
    : items;

  const columns = useMemo(
    () => [
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
        name: "Warehouse",
        selector: (row) => row.warehouse?.name,
        width: "150px",
      },
      {
        name: "Quantity",
        selector: (row) => row.quantity,
        sortable: true,
        width: "120px",
        cell: (row) => (
          <div
            style={{
              fontWeight: 600,
              color: row.isLowStock ? "var(--error-500)" : "inherit",
            }}
          >
            {row.quantity}
            {row.isLowStock && (
              <span
                style={{
                  marginLeft: "6px",
                  fontSize: "10px",
                  background: "var(--error-50)",
                  color: "var(--error-500)",
                  padding: "2px 6px",
                  borderRadius: "var(--radius-full)",
                }}
              >
                LOW
              </span>
            )}
          </div>
        ),
      },
      {
        name: "Min Stock",
        selector: (row) => row.minimumStock,
        width: "100px",
      },
      {
        name: "Cost Value",
        selector: (row) => row.costValue,
        sortable: true,
        width: "140px",
        cell: (row) => `Rp ${row.costValue.toLocaleString("id-ID")}`,
      },
      {
        name: "Retail Value",
        selector: (row) => row.retailValue,
        sortable: true,
        width: "140px",
        cell: (row) => (
          <div style={{ fontWeight: 600 }}>
            Rp {row.retailValue.toLocaleString("id-ID")}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory Report</h1>
          <p className="page-subtitle">Stock valuation and low stock alerts</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ marginBottom: "4px" }}>
            Warehouse
          </label>
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            style={{ width: "200px" }}
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={showLowStock}
            onChange={(e) => setShowLowStock(e.target.checked)}
            style={{
              width: "16px",
              height: "16px",
              accentColor: "var(--primary-500)",
            }}
          />
          Show Low Stock Only
        </label>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px" }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }}></div>
          <p style={{ color: "var(--gray-500)" }}>Loading report...</p>
        </div>
      ) : (
        <>
          <div className="stats-grid" style={{ marginBottom: "24px" }}>
            <div className="stat-card">
              <div className="stat-label">Total Products</div>
              <div className="stat-value">{summary?.productCount || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Stock</div>
              <div className="stat-value">
                {Math.round(summary?.totalItems || 0)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Cost Value</div>
              <div className="stat-value">
                Rp {(summary?.totalCostValue || 0).toLocaleString("id-ID")}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Retail Value</div>
              <div
                className="stat-value"
                style={{ color: "var(--success-600)" }}
              >
                Rp {(summary?.totalRetailValue || 0).toLocaleString("id-ID")}
              </div>
            </div>
          </div>

          {summary?.lowStockCount > 0 && (
            <div
              style={{
                padding: "16px 20px",
                background: "var(--warning-50)",
                borderRadius: "var(--radius-xl)",
                border: "1px solid var(--warning-500)",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "24px" }}>⚠️</span>
              <div>
                <strong style={{ color: "var(--warning-600)" }}>
                  {summary.lowStockCount} items
                </strong>{" "}
                are below minimum stock level
              </div>
            </div>
          )}

          <div className="data-table-container">
            <DataTable
              columns={columns}
              data={filteredItems}
              customStyles={customStyles}
              pagination
              paginationPerPage={20}
              highlightOnHover
              pointerOnHover
              onRowClicked={handleRowClick}
              noDataComponent={
                <div className="empty-state">
                  <div className="empty-state-icon">📦</div>
                  <div className="empty-state-title">No inventory data</div>
                  <p>No items match your filters</p>
                </div>
              }
            />
          </div>

          <InventoryDetailModal
            isOpen={showDetailModal}
            onClose={() => setShowDetailModal(false)}
            inventoryItem={selectedItem}
          />
        </>
      )}
    </div>
  );
}

export default InventoryReportPage;
