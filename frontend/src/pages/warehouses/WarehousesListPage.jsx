import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DataTable from "react-data-table-component";
import { useUiStore } from "../../store/uiStore.js";
import { useOutletStore } from "../../store/outletStore.js";
import * as warehousesApi from "../../api/warehousesApi.js";
import ConfirmModal from "../../components/ConfirmModal.jsx";
import WarehouseDetailModal from "../../components/warehouses/WarehouseDetailModal.jsx";
import WarehouseFormModal from "../../components/warehouses/WarehouseFormModal.jsx";

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

function WarehousesListPage() {
  const navigate = useNavigate();
  const showNotification = useUiStore((state) => state.showNotification);
  const activeOutlet = useOutletStore((state) => state.activeOutlet);

  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    id: null,
    name: "",
  });
  const [deleting, setDeleting] = useState(false);

  // Detail modal state
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Form modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);

  const handleOpenCreate = () => {
    setEditingWarehouse(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (warehouse) => {
    setEditingWarehouse(warehouse);
    setShowFormModal(true);
  };

  const handleFormSuccess = () => {
    loadWarehouses();
  };

  const handleRowClick = (row) => {
    setSelectedWarehouse(row);
    setShowDetailModal(true);
  };

  useEffect(() => {
    loadWarehouses();
  }, [currentPage, perPage, filterType, searchTerm, activeOutlet]);

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: perPage,
      };
      if (filterType) params.type = filterType;
      if (searchTerm) params.search = searchTerm;
      if (activeOutlet?.id) params.outletId = activeOutlet.id;

      const result = await warehousesApi.getWarehouses(params);
      setWarehouses(result.warehouses || []);
      setTotalRows(result.pagination?.total || 0);
    } catch (err) {
      // Error handled centrally
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (id, name) => {
    setDeleteModal({ open: true, id, name });
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await warehousesApi.deleteWarehouse(deleteModal.id);
      showNotification("Warehouse deleted successfully", "success");
      setDeleteModal({ open: false, id: null, name: "" });
      loadWarehouses();
    } catch (err) {
      // Error handled centrally
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        name: "Name",
        selector: (row) => row.name,
        sortable: true,
        cell: (row) => (
          <div>
            <div style={{ fontWeight: 500 }}>{row.name}</div>
            <div style={{ fontSize: "12px", color: "var(--gray-500)" }}>
              Code: {row.code}
            </div>
          </div>
        ),
      },
      {
        name: "Type",
        selector: (row) => row.type,
        sortable: true,
        width: "120px",
        cell: (row) => (
          <span
            className={`badge ${row.type === "CENTRAL" ? "badge-info" : "badge-neutral"}`}
          >
            {row.type}
          </span>
        ),
      },
      {
        name: "Location",
        selector: (row) => row.city,
        width: "180px",
        cell: (row) =>
          row.city ? (
            <div style={{ fontSize: "13px", color: "var(--gray-600)" }}>
              {row.city}
              {row.state ? `, ${row.state}` : ""}
            </div>
          ) : (
            "-"
          ),
      },
      {
        name: "Default",
        selector: (row) => row.isDefault,
        width: "100px",
        cell: (row) =>
          row.isDefault ? (
            <span className="badge badge-success">Default</span>
          ) : null,
      },
      {
        name: "Status",
        selector: (row) => row.isActive,
        width: "100px",
        cell: (row) => (
          <span
            className={`badge ${row.isActive ? "badge-success" : "badge-error"}`}
          >
            {row.isActive ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        name: "Actions",
        width: "150px",
        cell: (row) => (
          <div className="action-buttons">
            <button
              className="action-btn edit"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEdit(row);
              }}
            >
              Edit
            </button>
            <button
              className="action-btn delete"
              onClick={() => openDeleteModal(row.id, row.name)}
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    [navigate],
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Warehouses</h1>
          <p className="page-subtitle">Manage storage locations</p>
        </div>
        <button className="btn-primary btn-lg" onClick={handleOpenCreate}>
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Warehouse
        </button>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search by name or code..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          style={{ width: "250px" }}
        />
        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setCurrentPage(1);
          }}
          style={{ width: "160px" }}
        >
          <option value="">All Types</option>
          <option value="CENTRAL">Central</option>
          <option value="OUTLET">Outlet</option>
        </select>
      </div>

      <div className="data-table-container">
        <DataTable
          columns={columns}
          data={warehouses}
          progressPending={loading}
          pagination
          paginationServer
          paginationTotalRows={totalRows}
          onChangeRowsPerPage={(newPerPage, page) => {
            setPerPage(newPerPage);
            setCurrentPage(page);
          }}
          onChangePage={setCurrentPage}
          customStyles={customStyles}
          highlightOnHover
          pointerOnHover
          onRowClicked={handleRowClick}
          noDataComponent={
            <div className="empty-state">
              <div className="empty-state-icon">🏭</div>
              <div className="empty-state-title">No warehouses found</div>
              <p>Create warehouses to manage inventory across locations</p>
            </div>
          }
        />
      </div>

      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null, name: "" })}
        onConfirm={handleDelete}
        title="Delete Warehouse"
        message="Are you sure you want to delete"
        itemName={deleteModal.name}
        confirmText="Delete"
        confirmStyle="danger"
        loading={deleting}
      />

      <WarehouseDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        warehouse={selectedWarehouse}
      />

      <WarehouseFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        warehouse={editingWarehouse}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}

export default WarehousesListPage;
