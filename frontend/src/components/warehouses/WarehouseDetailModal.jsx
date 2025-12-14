import React, { useState, useEffect, useMemo } from "react";
import DataTable from "react-data-table-component";
import * as warehousesApi from "../../api/warehousesApi.js";

const customStyles = {
  headRow: {
    style: {
      backgroundColor: "var(--gray-50)",
      borderBottom: "1px solid var(--gray-200)",
      minHeight: "40px",
    },
  },
  headCells: {
    style: {
      fontSize: "12px",
      fontWeight: "600",
      color: "var(--gray-600)",
      textTransform: "uppercase",
      paddingLeft: "12px",
      paddingRight: "12px",
    },
  },
  rows: {
    style: {
      minHeight: "48px",
      fontSize: "13px",
    },
  },
  cells: {
    style: {
      paddingLeft: "12px",
      paddingRight: "12px",
    },
  },
};

function WarehouseDetailModal({ isOpen, onClose, warehouse }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStockItems: 0,
  });

  useEffect(() => {
    if (isOpen && warehouse) {
      // Reset state when warehouse changes
      setCurrentPage(1);
      loadInventory(1, perPage);
    }
  }, [isOpen, warehouse]);

  const loadInventory = async (page = 1, limit = 10) => {
    if (!warehouse) return;

    try {
      setLoading(true);
      const result = await warehousesApi.getWarehouseInventory(warehouse.id, {
        page,
        limit,
      });

      const inventoryItems = result.inventories || [];
      setInventory(inventoryItems);
      setTotalRows(result.pagination?.total || inventoryItems.length);

      // Calculate stats from current page (for display purposes)
      // Note: For accurate stats, you might need a separate API call
      let totalVal = 0;
      let lowStock = 0;

      inventoryItems.forEach((item) => {
        const qty = parseFloat(item.quantityOnHand || 0);
        const cost = parseFloat(item.product?.costPrice || 0);
        const min = parseFloat(item.minimumStock || 0);

        totalVal += qty * cost;
        if (qty <= min && qty > 0) lowStock++;
      });

      setStats({
        totalProducts: result.pagination?.total || inventoryItems.length,
        totalValue: totalVal,
        lowStockItems: lowStock,
      });
    } catch (err) {
      console.error("Failed to load warehouse inventory", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    loadInventory(page, perPage);
  };

  const handlePerRowsChange = (newPerPage, page) => {
    setPerPage(newPerPage);
    setCurrentPage(page);
    loadInventory(page, newPerPage);
  };

  const columns = useMemo(
    () => [
      {
        name: "Product",
        selector: (row) => row.product?.name,
        sortable: true,
        cell: (row) => (
          <div>
            <div style={{ fontWeight: 500 }}>{row.product?.name}</div>
            <div style={{ fontSize: "12px", color: "var(--gray-500)" }}>
              SKU: {row.product?.sku}
            </div>
          </div>
        ),
      },
      {
        name: "Category",
        selector: (row) => row.product?.category,
        sortable: true,
        width: "120px",
        cell: (row) => row.product?.category || "-",
      },
      {
        name: "Stock",
        selector: (row) => parseFloat(row.quantityOnHand || 0),
        sortable: true,
        width: "100px",
        cell: (row) => {
          const qty = parseFloat(row.quantityOnHand || 0);
          const min = parseFloat(row.minimumStock || 0);
          return (
            <span
              style={{
                fontWeight: 600,
                color: qty <= min ? "var(--warning-600)" : "var(--success-600)",
              }}
            >
              {qty} {row.product?.unit || "pcs"}
            </span>
          );
        },
      },
      {
        name: "Value",
        selector: (row) =>
          parseFloat(row.quantityOnHand || 0) *
          parseFloat(row.product?.costPrice || 0),
        sortable: true,
        width: "130px",
        cell: (row) => {
          const val =
            parseFloat(row.quantityOnHand || 0) *
            parseFloat(row.product?.costPrice || 0);
          return <span>Rp {val.toLocaleString("id-ID")}</span>;
        },
      },
    ],
    [],
  );

  if (!isOpen || !warehouse) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: "800px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{warehouse.name}</h2>
            <div
              style={{
                fontSize: "13px",
                color: "var(--gray-500)",
                marginTop: "4px",
              }}
            >
              {warehouse.city ? `${warehouse.city}, ` : ""}
              {warehouse.state || ""} • {warehouse.type}
            </div>
          </div>
          <button onClick={onClose} className="modal-close">
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Warehouse Details Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "16px",
              backgroundColor: "var(--gray-50)",
              padding: "16px",
              borderRadius: "var(--radius-lg)",
              marginBottom: "24px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--gray-500)",
                  textTransform: "uppercase",
                }}
              >
                Type
              </div>
              <div style={{ fontWeight: 500 }}>
                <span
                  className={`badge ${warehouse.type === "CENTRAL" ? "badge-info" : "badge-neutral"}`}
                >
                  {warehouse.type}
                </span>
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--gray-500)",
                  textTransform: "uppercase",
                }}
              >
                Status
              </div>
              <div style={{ fontWeight: 500 }}>
                <span
                  className={`badge ${warehouse.isActive ? "badge-success" : "badge-error"}`}
                >
                  {warehouse.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--gray-500)",
                  textTransform: "uppercase",
                }}
              >
                Items Held
              </div>
              <div style={{ fontWeight: 600, fontSize: "16px" }}>
                {stats.totalProducts}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--gray-500)",
                  textTransform: "uppercase",
                }}
              >
                Total Value
              </div>
              <div
                style={{
                  fontWeight: 600,
                  color: "var(--success-700)",
                  fontSize: "16px",
                }}
              >
                Rp {stats.totalValue.toLocaleString("id-ID")}
              </div>
            </div>

            {warehouse.address && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  marginTop: "8px",
                  paddingTop: "8px",
                  borderTop: "1px solid var(--gray-200)",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--gray-500)",
                    textTransform: "uppercase",
                    marginBottom: "4px",
                  }}
                >
                  Address
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--gray-700)",
                    lineHeight: "1.4",
                  }}
                >
                  {warehouse.address}
                </div>
              </div>
            )}
          </div>

          <h3
            style={{
              fontSize: "16px",
              fontWeight: 600,
              marginBottom: "12px",
              color: "var(--gray-800)",
            }}
          >
            Inventory Holdings
          </h3>
          <div
            className="data-table-container"
            style={{ boxShadow: "none", border: "1px solid var(--gray-200)" }}
          >
            <DataTable
              columns={columns}
              data={inventory}
              progressPending={loading}
              pagination
              paginationServer
              paginationTotalRows={totalRows}
              onChangeRowsPerPage={handlePerRowsChange}
              onChangePage={handlePageChange}
              paginationPerPage={perPage}
              paginationRowsPerPageOptions={[5, 10, 20]}
              customStyles={customStyles}
              noDataComponent={
                <div
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "var(--gray-500)",
                  }}
                >
                  No inventory in this warehouse
                </div>
              }
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default WarehouseDetailModal;
