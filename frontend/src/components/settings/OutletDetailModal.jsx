import React, { useState, useEffect } from "react";
import DataTable from "react-data-table-component";
import { format } from "date-fns";
import * as outletsApi from "../../api/outletsApi.js";

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

function OutletDetailModal({ isOpen, onClose, outlet: initialOutlet }) {
  const [outlet, setOutlet] = useState(initialOutlet);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && initialOutlet) {
      setOutlet(initialOutlet);
      loadDetails();
    }
  }, [isOpen, initialOutlet]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const data = await outletsApi.getOutletById(initialOutlet.id);
      setOutlet(data);
    } catch (err) {
      console.error("Failed to load outlet details", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !outlet) return null;

  const userColumns = [
    { name: "Name", selector: (row) => row.user.name, sortable: true },
    { name: "Username", selector: (row) => row.user.username },
    {
      name: "Role",
      selector: (row) => row.outletRole,
      cell: (row) => <span className="badge badge-info">{row.outletRole}</span>,
    },
    {
      name: "Status",
      selector: (row) => row.isDefaultForUser,
      cell: (row) =>
        row.isDefaultForUser ? (
          <span className="text-xs text-primary-600 font-medium">Default</span>
        ) : (
          "-"
        ),
    },
  ];

  const registerColumns = [
    { name: "Name", selector: (row) => row.name, sortable: true },
    { name: "Code", selector: (row) => row.code },
    {
      name: "Status",
      selector: (row) => row.isActive,
      cell: (row) =>
        row.isActive ? (
          <span className="text-success-600">Active</span>
        ) : (
          <span className="text-gray-400">Inactive</span>
        ),
    },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: "800px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{outlet.name}</h2>
            <div
              style={{
                fontSize: "13px",
                color: "var(--gray-500)",
                marginTop: "4px",
              }}
            >
              Code: {outlet.code} • {outlet.city || outlet.addressLine1}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              fontSize: "24px",
              color: "var(--gray-400)",
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
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
                Outlet Code
              </div>
              <div style={{ fontWeight: 500 }}>{outlet.code}</div>
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
                  className={`badge ${outlet.isActive ? "badge-success" : "badge-error"}`}
                >
                  {outlet.isActive ? "Active" : "Inactive"}
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
                Tax Name
              </div>
              <div style={{ fontWeight: 500 }}>{outlet.taxName}</div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--gray-500)",
                  textTransform: "uppercase",
                }}
              >
                Tax Rate
              </div>
              <div style={{ fontWeight: 700, fontSize: "16px" }}>
                {outlet.taxRate}%
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
                Phone
              </div>
              <div style={{ fontWeight: 500 }}>{outlet.phone || "-"}</div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--gray-500)",
                  textTransform: "uppercase",
                }}
              >
                City
              </div>
              <div style={{ fontWeight: 500 }}>{outlet.city || "-"}</div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--gray-500)",
                  textTransform: "uppercase",
                }}
              >
                Users
              </div>
              <div style={{ fontWeight: 600, color: "var(--primary-700)" }}>
                {outlet.outletUsers?.length || 0} Assigned
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
                Registers
              </div>
              <div style={{ fontWeight: 600, color: "var(--primary-700)" }}>
                {outlet.posRegisters?.length || 0} Registered
              </div>
            </div>

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
                {outlet.addressLine1}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  marginBottom: "12px",
                  color: "var(--gray-700)",
                }}
              >
                Assigned Users
              </h3>
              <div
                className="data-table-container"
                style={{
                  boxShadow: "none",
                  border: "1px solid var(--gray-200)",
                }}
              >
                <DataTable
                  columns={userColumns}
                  data={outlet.outletUsers || []}
                  progressPending={loading}
                  customStyles={customStyles}
                  dense
                  noDataComponent={
                    <div className="p-4 text-center text-gray-500">
                      No users assigned
                    </div>
                  }
                />
              </div>
            </div>

            <div>
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  marginBottom: "12px",
                  color: "var(--gray-700)",
                }}
              >
                Registers
              </h3>
              <div
                className="data-table-container"
                style={{
                  boxShadow: "none",
                  border: "1px solid var(--gray-200)",
                }}
              >
                <DataTable
                  columns={registerColumns}
                  data={outlet.posRegisters || []}
                  progressPending={loading}
                  customStyles={customStyles}
                  dense
                  noDataComponent={
                    <div className="p-4 text-center text-gray-500">
                      No registers
                    </div>
                  }
                />
              </div>
            </div>
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

export default OutletDetailModal;
