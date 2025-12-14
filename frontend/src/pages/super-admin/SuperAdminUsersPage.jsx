import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DataTable from "react-data-table-component";
import * as superAdminApi from "../../api/superAdminApi.js";
import * as invitationsApi from "../../api/invitationsApi.js";
import { useDebounce } from "../../hooks/useDebounce.js";
import { useUiStore } from "../../store/uiStore.js";
import { useAuthStore } from "../../store/authStore.js";

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

const ROLE_BADGES = {
  SUPER_ADMIN: { label: "Super Admin", className: "badge-primary" },
  OWNER: { label: "Owner", className: "badge-info" },
  ADMIN: { label: "Admin", className: "badge-warning" },
  MANAGER: { label: "Manager", className: "badge-secondary" },
  CASHIER: { label: "Cashier", className: "badge-success" },
  WAREHOUSE_STAFF: { label: "Warehouse", className: "badge-secondary" },
};

function SuperAdminUsersPage() {
  const navigate = useNavigate();
  const showNotification = useUiStore((state) => state.showNotification);
  const startImpersonation = useAuthStore((state) => state.startImpersonation);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("CASHIER");
  const [inviteBusinessId, setInviteBusinessId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [businesses, setBusinesses] = useState([]);

  const handleImpersonate = async (user) => {
    try {
      await startImpersonation(user.id);
      showNotification(`Now viewing as ${user.name}`, "success");
      navigate("/dashboard");
    } catch (err) {
      showNotification(err.message || "Failed to impersonate user", "error");
    }
  };

  useEffect(() => {
    loadUsers();
    loadBusinesses();
  }, [currentPage, perPage, debouncedSearchTerm, roleFilter, statusFilter]);

  async function loadBusinesses() {
    try {
      const response = await superAdminApi.getBusinesses({ limit: 100 });
      setBusinesses(response.businesses || []);
    } catch (err) {
      console.error("Failed to load businesses:", err);
    }
  }

  async function loadUsers() {
    try {
      setLoading(true);
      const params = { page: currentPage, limit: perPage };
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.isActive = statusFilter === "active";

      const response = await superAdminApi.getAllUsers(params);
      setUsers(response.users || []);
      setTotalRows(response.pagination?.total || 0);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusToggle(userId, currentStatus) {
    try {
      await superAdminApi.updateUserStatus(userId, !currentStatus);
      loadUsers();
      if (showDetailModal && selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, isActive: !currentStatus });
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  }

  async function handlePasswordReset() {
    if (!newPassword || newPassword.length < 8) {
      alert("Password must be at least 8 characters");
      return;
    }
    try {
      await superAdminApi.forcePasswordReset(selectedUser.id, newPassword);
      setShowResetModal(false);
      setNewPassword("");
      alert("Password reset successfully");
    } catch (err) {
      console.error("Failed to reset password:", err);
    }
  }

  async function loadSessions(userId) {
    try {
      setSessionsLoading(true);
      const response = await superAdminApi.getUserSessions(userId);
      setSessions(response.sessions || []);
    } catch (err) {
      console.error("Failed to load sessions:", err);
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }

  async function handleRevokeAllSessions() {
    try {
      await superAdminApi.revokeAllSessions(selectedUser.id);
      loadSessions(selectedUser.id);
    } catch (err) {
      console.error("Failed to revoke sessions:", err);
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
    setSelectedUser(row);
    setShowDetailModal(true);
    loadSessions(row.id);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !inviteBusinessId) {
      showNotification("Email and Business are required", "error");
      return;
    }
    try {
      setInviting(true);
      await invitationsApi.createInvitation({
        email: inviteEmail,
        role: inviteRole,
        businessId: inviteBusinessId,
      });
      showNotification("Invitation sent successfully!", "success");
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteRole("CASHIER");
      setInviteBusinessId("");
    } catch (err) {
      showNotification(err.message || "Failed to send invitation", "error");
    } finally {
      setInviting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        name: "User",
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
              @{row.username}
            </div>
          </div>
        ),
      },
      {
        name: "Email",
        selector: (row) => row.email || "-",
        width: "200px",
        cell: (row) => (
          <span style={{ color: "var(--gray-700)" }}>{row.email || "-"}</span>
        ),
      },
      {
        name: "Role",
        width: "130px",
        cell: (row) => {
          const badge = ROLE_BADGES[row.role] || {
            label: row.role,
            className: "badge-secondary",
          };
          return (
            <span className={`badge ${badge.className}`}>{badge.label}</span>
          );
        },
      },
      {
        name: "Business",
        selector: (row) => row.business?.name || "—",
        width: "150px",
        cell: (row) => (
          <span style={{ color: "var(--gray-600)", fontSize: "13px" }}>
            {row.business?.name || "—"}
          </span>
        ),
      },
      {
        name: "Status",
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
        width: "200px",
        cell: (row) => (
          <div className="action-buttons">
            {row.role !== "SUPER_ADMIN" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleImpersonate(row);
                }}
                className="action-btn"
                style={{
                  fontSize: "11px",
                  background: "var(--warning-500)",
                  color: "white",
                }}
              >
                Impersonate
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUser(row);
                setShowResetModal(true);
              }}
              className="action-btn edit"
              style={{ fontSize: "11px" }}
            >
              Reset PW
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
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage all users across businesses</p>
        </div>
        <button
          className="btn-primary btn-lg"
          onClick={() => setShowInviteModal(true)}
          style={{ display: "flex", alignItems: "center" }}
        >
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ marginRight: "8px" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          Invite User
        </button>
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
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              style={{ width: "100%", paddingLeft: "40px" }}
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="form-select"
            style={{ width: "160px" }}
          >
            <option value="">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="OWNER">Owner</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="CASHIER">Cashier</option>
            <option value="WAREHOUSE_STAFF">Warehouse Staff</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="form-select"
            style={{ width: "140px" }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="data-table-container">
        <DataTable
          columns={columns}
          data={users}
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
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">No users found</div>
              <p>No users match your search criteria</p>
            </div>
          }
        />
      </div>

      {/* User Detail Modal */}
      {showDetailModal && selectedUser && (
        <div
          className="modal-overlay"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "550px" }}
          >
            <div className="modal-header">
              <h2 className="modal-title">User Details</h2>
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
                  {selectedUser.name}
                </h3>
                <code style={{ color: "var(--gray-500)", fontSize: "14px" }}>
                  @{selectedUser.username}
                </code>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px",
                }}
              >
                <DetailItem label="Email">
                  {selectedUser.email || "—"}
                </DetailItem>
                <DetailItem label="Phone">
                  {selectedUser.phone || "—"}
                </DetailItem>
                <DetailItem label="Role">
                  {(() => {
                    const badge = ROLE_BADGES[selectedUser.role] || {
                      label: selectedUser.role,
                      className: "badge-secondary",
                    };
                    return (
                      <span className={`badge ${badge.className}`}>
                        {badge.label}
                      </span>
                    );
                  })()}
                </DetailItem>
                <DetailItem label="Status">
                  <span
                    className={`badge ${selectedUser.isActive ? "badge-success" : "badge-error"}`}
                  >
                    {selectedUser.isActive ? "Active" : "Inactive"}
                  </span>
                </DetailItem>
                <DetailItem label="Business">
                  {selectedUser.business?.name || "—"}
                </DetailItem>
                <DetailItem label="Outlets">
                  {selectedUser.outletUsers?.length || 0} assigned
                </DetailItem>
                <DetailItem label="Created">
                  {new Date(selectedUser.createdAt).toLocaleDateString()}
                </DetailItem>
                <DetailItem label="Last Session">
                  {sessionsLoading
                    ? "Loading..."
                    : sessions.length > 0
                      ? new Date(sessions[0].createdAt).toLocaleString()
                      : "No sessions"}
                </DetailItem>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setShowSessionsModal(true);
                  loadSessions(selectedUser.id);
                }}
                className="btn-secondary"
              >
                View Sessions
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setShowResetModal(true);
                }}
                className="btn-secondary"
              >
                Reset Password
              </button>
              <button
                onClick={() =>
                  handleStatusToggle(selectedUser.id, selectedUser.isActive)
                }
                className="btn-primary"
                disabled={selectedUser.role === "SUPER_ADMIN"}
                style={{
                  background: selectedUser.isActive ? "#ef4444" : "#10b981",
                }}
              >
                {selectedUser.isActive ? "Disable User" : "Enable User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "400px" }}
          >
            <div className="modal-header">
              <h2 className="modal-title">Reset Password</h2>
              <button
                className="modal-close"
                onClick={() => setShowResetModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: "16px" }}>
                Reset password for <strong>{selectedUser.name}</strong>
              </p>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  placeholder="Min 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-control"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setNewPassword("");
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button onClick={handlePasswordReset} className="btn-primary">
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Modal */}
      {showSessionsModal && selectedUser && (
        <div
          className="modal-overlay"
          onClick={() => setShowSessionsModal(false)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "500px" }}
          >
            <div className="modal-header">
              <h2 className="modal-title">Active Sessions</h2>
              <button
                className="modal-close"
                onClick={() => setShowSessionsModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: "16px", color: "var(--gray-600)" }}>
                Sessions for <strong>{selectedUser.name}</strong>
              </p>
              {sessionsLoading ? (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <div className="spinner"></div>
                </div>
              ) : sessions.length === 0 ? (
                <div className="empty-state" style={{ padding: "24px" }}>
                  <p style={{ color: "var(--gray-500)" }}>No active sessions</p>
                </div>
              ) : (
                <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                  {sessions.map((session) => (
                    <div
                      key={session.sessionId}
                      style={{
                        padding: "12px",
                        background: "var(--gray-50)",
                        borderRadius: "8px",
                        marginBottom: "8px",
                      }}
                    >
                      <div
                        style={{ fontSize: "12px", color: "var(--gray-500)" }}
                      >
                        Session: {session.sessionId?.slice(0, 8)}...
                      </div>
                      <div style={{ fontSize: "13px", marginTop: "4px" }}>
                        Created: {new Date(session.createdAt).toLocaleString()}
                      </div>
                      <div style={{ fontSize: "13px" }}>
                        Expires in: {Math.floor(session.expiresIn / 3600)}h
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              {sessions.length > 0 && (
                <button
                  onClick={handleRevokeAllSessions}
                  className="btn-primary"
                  style={{ background: "#ef4444", marginRight: "auto" }}
                >
                  Revoke All
                </button>
              )}
              <button
                onClick={() => setShowSessionsModal(false)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className="modal"
            style={{ maxWidth: "450px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">Invite User</h2>
              <button
                className="modal-close"
                onClick={() => setShowInviteModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleInvite}>
              <div className="modal-body">
                <p
                  style={{
                    color: "var(--gray-600)",
                    marginBottom: "20px",
                    fontSize: "14px",
                  }}
                >
                  Send an email invitation to add a new user to a business.
                </p>
                <div className="form-group">
                  <label className="form-label">Business *</label>
                  <select
                    value={inviteBusinessId}
                    onChange={(e) => setInviteBusinessId(e.target.value)}
                    className="form-control"
                    required
                  >
                    <option value="">Select a business</option>
                    {businesses.map((biz) => (
                      <option key={biz.id} value={biz.id}>
                        {biz.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="form-control"
                  >
                    <option value="OWNER">Owner</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="WAREHOUSE_STAFF">Warehouse Staff</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={inviting}
                >
                  {inviting ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
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

export default SuperAdminUsersPage;
