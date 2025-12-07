import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import DataTable from "react-data-table-component";
import { useUiStore } from "../../store/uiStore.js";
import { useOutletStore } from "../../store/outletStore.js";
import * as inventoryApi from "../../api/inventoryApi.js";
import * as warehousesApi from "../../api/warehousesApi.js";
import InventoryAdjustModal from "../../components/inventory/InventoryAdjustModal.jsx";
import InventoryTransferModal from "../../components/inventory/InventoryTransferModal.jsx";
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
      paddingLeft: "16px",
      paddingRight: "16px",
    },
  },
  rows: {
    style: {
      minHeight: "60px",
      fontSize: "14px",
      "&:hover": {
        backgroundColor: "var(--gray-50)",
      },
    },
  },
  cells: {
    style: {
      paddingLeft: "16px",
      paddingRight: "16px",
    },
  },
};

function InventoryOverviewPage() {
  const navigate = useNavigate();
  const showNotification = useUiStore((state) => state.showNotification);
  const activeOutlet = useOutletStore((state) => state.activeOutlet);

  const [inventory, setInventory] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterWarehouse, setFilterWarehouse] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);

  // ACTION MODALS STATE
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const openAdjustModal = (item = null) => {
    setSelectedItem(item);
    setShowAdjustModal(true);
  };

  const openTransferModal = (item = null) => {
    setSelectedItem(item);
    setShowTransferModal(true);
  };

  const handleRowClick = (row) => {
    setSelectedItem(row);
    setShowDetailModal(true);
  };

  useEffect(() => {
    loadWarehouses();
  }, [activeOutlet]);

  useEffect(() => {
    loadInventory();
  }, [currentPage, perPage, filterWarehouse, filterLowStock]);

  const loadWarehouses = async () => {
    try {
      const result = await warehousesApi.getWarehouses({
        outletId: activeOutlet?.id,
        limit: 100,
      });
      setWarehouses(result.warehouses || []);
    } catch (err) {
      console.error("Failed to load warehouses", err);
    }
  };

  const loadInventory = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: perPage,
      };
      if (filterWarehouse) params.warehouseId = filterWarehouse;
      if (filterLowStock) params.lowStock = "true";

      const result = await inventoryApi.getInventory(params);
      setInventory(result.inventories || []);
      setTotalRows(result.pagination?.total || 0);
    } catch (err) {
      showNotification("Failed to load inventory", "error");
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const total = inventory.length;
    const lowStock = inventory.filter(
      (i) => parseFloat(i.quantityOnHand) <= parseFloat(i.minimumStock || 10),
    ).length;
    const outOfStock = inventory.filter(
      (i) => parseFloat(i.quantityOnHand) <= 0,
    ).length;
    const totalValue = inventory.reduce(
      (sum, i) =>
        sum +
        parseFloat(i.quantityOnHand) * parseFloat(i.product?.costPrice || 0),
      0,
    );
    return { total, lowStock, outOfStock, totalValue };
  }, [inventory]);

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
        name: "Warehouse",
        selector: (row) => row.warehouse?.name,
        sortable: true,
        width: "160px",
        cell: (row) => (
          <span className="badge badge-info">{row.warehouse?.name}</span>
        ),
      },
      {
        name: "Quantity",
        selector: (row) => parseFloat(row.quantityOnHand),
        sortable: true,
        width: "120px",
        cell: (row) => (
          <span
            style={{
              fontWeight: 600,
              color:
                parseFloat(row.quantityOnHand) <= 0
                  ? "var(--error-500)"
                  : parseFloat(row.quantityOnHand) <=
                      parseFloat(row.minimumStock || 10)
                    ? "var(--warning-500)"
                    : "var(--gray-800)",
            }}
          >
            {parseFloat(row.quantityOnHand)} {row.product?.unit || "pcs"}
          </span>
        ),
      },
      {
        name: "Min Stock",
        selector: (row) => parseFloat(row.minimumStock),
        sortable: true,
        width: "130px",
        cell: (row) => parseFloat(row.minimumStock || 0),
      },
      {
        name: "Status",
        width: "120px",
        cell: (row) => {
          const qty = parseFloat(row.quantityOnHand);
          const min = parseFloat(row.minimumStock || 10);
          if (qty <= 0) {
            return <span className="badge badge-error">Out of Stock</span>;
          } else if (qty <= min) {
            return <span className="badge badge-warning">Low Stock</span>;
          }
          return <span className="badge badge-success">In Stock</span>;
        },
      },
      {
        name: "Value",
        selector: (row) =>
          parseFloat(row.quantityOnHand) *
          parseFloat(row.product?.costPrice || 0),
        sortable: true,
        width: "140px",
        cell: (row) => (
          <span style={{ color: "var(--gray-600)" }}>
            Rp{" "}
            {(
              parseFloat(row.quantityOnHand) *
              parseFloat(row.product?.costPrice || 0)
            ).toLocaleString("id-ID")}
          </span>
        ),
      },
      {
        name: "Actions",
        width: "180px",
        cell: (row) => (
          <div className="action-buttons">
            <button
              className="action-btn view"
              onClick={() => openTransferModal(row)}
              title="Transfer Stock"
            >
              Transfer
            </button>
            <button
              className="action-btn edit"
              onClick={() => openAdjustModal(row)}
              title="Adjust Stock"
            >
              Adjust
            </button>
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
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">
            Monitor stock levels across warehouses
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="btn-secondary"
            onClick={() => openAdjustModal(null)}
          >
            Adjust Stock
          </button>
          <button
            className="btn-primary"
            onClick={() => openTransferModal(null)}
          >
            Transfer Stock
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Items</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Low Stock Items</div>
          <div className="stat-value" style={{ color: "var(--warning-500)" }}>
            {stats.lowStock}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Out of Stock</div>
          <div className="stat-value" style={{ color: "var(--error-500)" }}>
            {stats.outOfStock}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Value</div>
          <div className="stat-value" style={{ fontSize: "22px" }}>
            Rp {stats.totalValue.toLocaleString("id-ID")}
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <select
          value={filterWarehouse}
          onChange={(e) => {
            setFilterWarehouse(e.target.value);
            setCurrentPage(1);
          }}
          style={{ width: "200px" }}
        >
          <option value="">All Warehouses</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
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
            checked={filterLowStock}
            onChange={(e) => {
              setFilterLowStock(e.target.checked);
              setCurrentPage(1);
            }}
            style={{
              width: "16px",
              height: "16px",
              accentColor: "var(--primary-500)",
            }}
          />
          Show Low Stock Only
        </label>
      </div>

      <div className="data-table-container">
        <DataTable
          columns={columns}
          data={inventory}
          progressPending={loading}
          pagination
          paginationServer
          paginationTotalRows={totalRows}
          onChangeRowsPerPage={(newPerPage, page) => {
            setPerPage(newPerPage);
            setCurrentPage(page);
          }}
          onChangePage={(page) => setCurrentPage(page)}
          customStyles={customStyles}
          highlightOnHover
          pointerOnHover
          onRowClicked={handleRowClick}
          noDataComponent={
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-title">No inventory data</div>
              <p>
                Stock levels will appear here after you make purchases or
                adjustments
              </p>
            </div>
          }
        />
      </div>

      {/* ACTION MODALS */}
      <InventoryAdjustModal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        preselectedProductId={selectedItem?.product?.id}
        preselectedWarehouseId={selectedItem?.warehouse?.id}
        onSuccess={() => {
          loadInventory();
          loadWarehouses(); // Refresh warehouses too in case quantities changed there
        }}
      />

      <InventoryTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        preselectedProductId={selectedItem?.product?.id}
        preselectedWarehouseId={selectedItem?.warehouse?.id}
        onSuccess={() => {
          loadInventory();
          loadWarehouses();
        }}
      />

      <InventoryDetailModal
        isOpen={showDetailModal}
        inventoryItem={selectedItem}
        onClose={() => setShowDetailModal(false)}
      />
    </div>
  );
}

export default InventoryOverviewPage;
