import React, { useState, useEffect, useMemo } from "react";
import DataTable from "react-data-table-component";
import * as superAdminApi from "../../api/superAdminApi.js";
import { useDebounce } from "../../hooks/useDebounce.js";

// Custom styles matching project design
const customStyles = {
  table: {
    style: {
      backgroundColor: "transparent",
    },
  },
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
      color: "var(--gray-800)",
      cursor: "pointer",
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
  pagination: {
    style: {
      borderTop: "1px solid var(--gray-200)",
      minHeight: "56px",
    },
  },
};

function BusinessesPage() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadBusinesses();
  }, [currentPage, perPage, debouncedSearchTerm, statusFilter]);

  async function loadBusinesses() {
    try {
      setLoading(true);
      const params = { page: currentPage, limit: perPage };
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      if (statusFilter) params.status = statusFilter;

      const response = await superAdminApi.getBusinesses(params);
      setBusinesses(response.businesses || []);
      setTotalRows(response.pagination?.total || 0);
    } catch (err) {
      console.error("Failed to load businesses:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id, newStatus) {
    try {
      await superAdminApi.updateBusinessStatus(id, newStatus);
      setShowStatusModal(false);
      setSelectedBusiness(null);
      loadBusinesses();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  }

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePerRowsChange = (newPerPage, page) => {
    setPerPage(newPerPage);
    setCurrentPage(page);
  };

  const handleRowClick = (row) => {
    setSelectedBusiness(row);
    setShowDetailModal(true);
  };

  const columns = useMemo(
    () => [
      {
        name: "Business",
        selector: (row) => row.name,
        sortable: true,
        cell: (row) => (
          <div>
            <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>
              {row.name}
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "var(--gray-500)",
                fontFamily: "monospace",
              }}
            >
              {row.code}
            </div>
          </div>
        ),
      },
      {
        name: "Status",
        width: "120px",
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        name: "Users",
        width: "100px",
        selector: (row) => row._count?.users || 0,
        cell: (row) => (
          <span style={{ color: "var(--gray-700)" }}>
            {row._count?.users || 0}
          </span>
        ),
      },
      {
        name: "Outlets",
        width: "100px",
        selector: (row) => row._count?.outlets || 0,
        cell: (row) => (
          <span style={{ color: "var(--gray-700)" }}>
            {row._count?.outlets || 0}
          </span>
        ),
      },
      {
        name: "Products",
        width: "100px",
        selector: (row) => row._count?.products || 0,
        cell: (row) => (
          <span style={{ color: "var(--gray-700)" }}>
            {row._count?.products || 0}
          </span>
        ),
      },
      {
        name: "Created",
        width: "120px",
        selector: (row) => row.createdAt,
        cell: (row) => (
          <span style={{ color: "var(--gray-600)", fontSize: "13px" }}>
            {new Date(row.createdAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        name: "Actions",
        width: "100px",
        cell: (row) => (
          <div className="action-buttons">
            <button
              className="action-btn edit"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedBusiness(row);
                setShowStatusModal(true);
              }}
            >
              Status
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
          <h1 className="page-title">Businesses</h1>
          <p className="page-subtitle">Manage all registered businesses</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div
            style={{
              position: "relative",
              flex: 1,
              minWidth: "240px",
              maxWidth: "400px",
            }}
          >
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--gray-400)",
              }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search businesses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              style={{ width: "100%", paddingLeft: "40px" }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="form-select"
            style={{ width: "160px" }}
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
      </div>

      <div className="data-table-container">
        <DataTable
          columns={columns}
          data={businesses}
          progressPending={loading}
          customStyles={customStyles}
          highlightOnHover
          pointerOnHover
          onRowClicked={handleRowClick}
          pagination
          paginationServer
          paginationTotalRows={totalRows}
          onChangeRowsPerPage={handlePerRowsChange}
          onChangePage={handlePageChange}
          paginationPerPage={perPage}
          responsive
          noDataComponent={
            <div className="empty-state">
              <div className="empty-state-icon">🏢</div>
              <div className="empty-state-title">No businesses found</div>
              <p>No businesses match your search criteria</p>
            </div>
          }
        />
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedBusiness && (
        <div
          className="modal-overlay"
          onClick={() => setShowDetailModal(false)}
        >
          <button
            className="modal-close"
            onClick={() => setShowDetailModal(false)}
          >
            ×
          </button>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "550px" }}
          >
            <div className="modal-header">
              <h2 className="modal-title">Business Details</h2>
              <button
                className="modal-close"
                onClick={() => setShowDetailModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ margin: 0, fontSize: "22px" }}>
                  {selectedBusiness.name}
                </h3>
                <code style={{ color: "var(--gray-500)", fontSize: "14px" }}>
                  {selectedBusiness.code}
                </code>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px",
                }}
              >
                <DetailItem label="Status">
                  <StatusBadge status={selectedBusiness.status} />
                </DetailItem>
                <DetailItem label="Created">
                  {new Date(selectedBusiness.createdAt).toLocaleDateString()}
                </DetailItem>
                <DetailItem label="Total Users">
                  {selectedBusiness._count?.users || 0}
                </DetailItem>
                <DetailItem label="Total Outlets">
                  {selectedBusiness._count?.outlets || 0}
                </DetailItem>
                <DetailItem label="Total Products">
                  {selectedBusiness._count?.products || 0}
                </DetailItem>
                {selectedBusiness.suspendedAt && (
                  <DetailItem label="Suspended At">
                    {new Date(selectedBusiness.suspendedAt).toLocaleString()}
                  </DetailItem>
                )}
              </div>

              {selectedBusiness.address && (
                <div style={{ marginTop: "20px" }}>
                  <DetailItem label="Address">
                    {selectedBusiness.address}
                  </DetailItem>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setShowStatusModal(true);
                }}
                className="btn-primary"
              >
                Change Status
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && selectedBusiness && (
        <div
          className="modal-overlay"
          onClick={() => setShowStatusModal(false)}
        >
          <button
            className="modal-close"
            onClick={() => setShowStatusModal(false)}
          >
            ×
          </button>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "400px" }}
          >
            <div className="modal-header">
              <h2 className="modal-title">Change Status</h2>
              <button
                className="modal-close"
                onClick={() => setShowStatusModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: "12px" }}>
                <strong>{selectedBusiness.name}</strong>
              </p>
              <p style={{ color: "var(--gray-500)", marginBottom: "20px" }}>
                Current status: <StatusBadge status={selectedBusiness.status} />
              </p>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {selectedBusiness.status !== "ACTIVE" && (
                  <button
                    onClick={() =>
                      handleStatusChange(selectedBusiness.id, "ACTIVE")
                    }
                    className="btn-primary"
                    style={{ background: "#10b981" }}
                  >
                    Activate
                  </button>
                )}
                {selectedBusiness.status !== "SUSPENDED" && (
                  <button
                    onClick={() =>
                      handleStatusChange(selectedBusiness.id, "SUSPENDED")
                    }
                    className="btn-primary"
                    style={{ background: "#ef4444" }}
                  >
                    Suspend
                  </button>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowStatusModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const badges = {
    ACTIVE: "badge-success",
    SUSPENDED: "badge-error",
    PENDING: "badge-warning",
  };

  return (
    <span className={`badge ${badges[status] || "badge-secondary"}`}>
      {status}
    </span>
  );
}

function DetailItem({ label, children }) {
  return (
    <div>
      <div
        style={{
          fontSize: "12px",
          color: "var(--gray-500)",
          textTransform: "uppercase",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "14px", fontWeight: 500 }}>{children}</div>
    </div>
  );
}

export default BusinessesPage;
