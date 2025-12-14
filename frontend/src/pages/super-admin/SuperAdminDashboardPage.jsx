import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import DataTable from "react-data-table-component";
import * as superAdminApi from "../../api/superAdminApi.js";
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
      minHeight: "56px",
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
};

const quickActions = [
  {
    path: "/super-admin/businesses",
    label: "Manage Businesses",
    icon: "🏢",
    description: "View, suspend, or activate businesses",
    gradient: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
  },
  {
    path: "/super-admin/users",
    label: "Manage Users",
    icon: "👥",
    description: "View all users, reset passwords",
    gradient: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)",
  },
  {
    path: "/super-admin/invitations",
    label: "Invitations",
    icon: "✉️",
    description: "Manage pending invitations",
    gradient: "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
  },
  {
    path: "/super-admin/audit-logs",
    label: "Audit Logs",
    icon: "📋",
    description: "View platform activity",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
  },
];

function SuperAdminDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const response = await superAdminApi.getDashboard();
      setStats(response);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const handleRowClick = (row) => {
    setSelectedBusiness(row);
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
        cell: (row) => {
          const badges = {
            ACTIVE: "badge-success",
            SUSPENDED: "badge-error",
            PENDING: "badge-warning",
          };
          return (
            <span
              className={`badge ${badges[row.status] || "badge-secondary"}`}
            >
              {row.status}
            </span>
          );
        },
      },
      {
        name: "Users",
        width: "100px",
        selector: (row) => row._count?.users || 0,
        cell: (row) => (
          <span style={{ color: "var(--gray-700)", fontWeight: 500 }}>
            {row._count?.users || 0}
          </span>
        ),
      },
      {
        name: "Outlets",
        width: "100px",
        selector: (row) => row._count?.outlets || 0,
        cell: (row) => (
          <span style={{ color: "var(--gray-700)", fontWeight: 500 }}>
            {row._count?.outlets || 0}
          </span>
        ),
      },
      {
        name: "Created",
        width: "130px",
        selector: (row) => row.createdAt,
        cell: (row) => (
          <span style={{ color: "var(--gray-600)", fontSize: "13px" }}>
            {new Date(row.createdAt).toLocaleDateString()}
          </span>
        ),
      },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="page-container">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "400px",
          }}
        >
          <div
            className="spinner"
            style={{ width: "48px", height: "48px" }}
          ></div>
          <p
            style={{
              marginTop: "20px",
              color: "var(--gray-500)",
              fontSize: "15px",
            }}
          >
            Loading platform dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Hero Header */}
      <div
        style={{
          background:
            "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
          borderRadius: "var(--radius-xl)",
          padding: "32px",
          marginBottom: "32px",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: "40%",
            background:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            opacity: 0.5,
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ marginBottom: "6px", fontSize: "13px", opacity: 0.85 }}>
            {getGreeting()},
          </div>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 700,
              marginBottom: "6px",
              letterSpacing: "-0.02em",
            }}
          >
            {user?.name || "Super Admin"}! 👋
          </h1>
          <p style={{ fontSize: "13px", opacity: 0.8, maxWidth: "500px" }}>
            Welcome to the platform administration dashboard. Monitor and manage
            all businesses from here.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              marginTop: "24px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(10px)",
                padding: "6px 12px",
                borderRadius: "var(--radius-full)",
                fontSize: "12px",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span style={{ fontSize: "14px" }}>🛡️</span>
              Super Admin
            </div>
            <div style={{ fontSize: "12px", opacity: 0.8 }}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ marginBottom: "28px" }}>
        <h2
          style={{
            fontSize: "15px",
            fontWeight: 600,
            marginBottom: "12px",
            color: "var(--gray-800)",
          }}
        >
          Platform Overview
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
          }}
        >
          <StatCard
            title="Total Businesses"
            value={stats?.businesses?.total || 0}
            icon="🏢"
            gradient="linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)"
            trend={
              stats?.businesses?.active
                ? `${stats.businesses.active} active`
                : null
            }
          />
          <StatCard
            title="Active Businesses"
            value={stats?.businesses?.active || 0}
            icon="✅"
            gradient="linear-gradient(135deg, #10b981 0%, #34d399 100%)"
          />
          <StatCard
            title="Suspended"
            value={stats?.businesses?.suspended || 0}
            icon="⏸️"
            gradient="linear-gradient(135deg, #ef4444 0%, #f87171 100%)"
            warning={stats?.businesses?.suspended > 0}
          />
          <StatCard
            title="Total Users"
            value={stats?.users?.total || 0}
            icon="👥"
            gradient="linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)"
            trend={stats?.users?.active ? `${stats.users.active} active` : null}
          />
          <StatCard
            title="Total Outlets"
            value={stats?.outlets?.total || 0}
            icon="🏪"
            gradient="linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)"
          />
          <StatCard
            title="Total Products"
            value={stats?.products?.total || 0}
            icon="📦"
            gradient="linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: "28px" }}>
        <h2
          style={{
            fontSize: "15px",
            fontWeight: 600,
            marginBottom: "12px",
            color: "var(--gray-800)",
          }}
        >
          Quick Actions
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
          }}
        >
          {quickActions.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "20px",
                background: "white",
                borderRadius: "var(--radius-xl)",
                boxShadow: "var(--shadow-sm)",
                border: "1px solid var(--gray-100)",
                textDecoration: "none",
                color: "inherit",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "var(--radius-lg)",
                  background: action.gradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "26px",
                  flexShrink: 0,
                }}
              >
                {action.icon}
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "13px",
                    marginBottom: "2px",
                  }}
                >
                  {action.label}
                </div>
                <div style={{ fontSize: "12px", color: "var(--gray-500)" }}>
                  {action.description}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Businesses */}
      <div className="data-table-container">
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--gray-200)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
              Recent Businesses
            </h3>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "12px",
                color: "var(--gray-500)",
              }}
            >
              Latest registered businesses on the platform
            </p>
          </div>
          <Link
            to="/super-admin/businesses"
            className="btn-secondary"
            style={{ fontSize: "13px" }}
          >
            View All
          </Link>
        </div>
        <DataTable
          columns={columns}
          data={stats?.recentBusinesses || []}
          customStyles={customStyles}
          highlightOnHover
          pointerOnHover
          onRowClicked={handleRowClick}
          responsive
          noDataComponent={
            <div className="empty-state">
              <div className="empty-state-icon">🏢</div>
              <div className="empty-state-title">No businesses yet</div>
              <p>Businesses will appear here once created</p>
            </div>
          }
        />
      </div>

      {/* Business Detail Modal */}
      {selectedBusiness && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedBusiness(null)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "520px" }}
          >
            <div className="modal-header">
              <h2 className="modal-title">Business Details</h2>
              <button
                className="modal-close"
                onClick={() => setSelectedBusiness(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ margin: 0, fontSize: "18px" }}>
                  {selectedBusiness.name}
                </h3>
                <code style={{ color: "var(--gray-500)", fontSize: "12px" }}>
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
                  <span
                    className={`badge ${
                      selectedBusiness.status === "ACTIVE"
                        ? "badge-success"
                        : selectedBusiness.status === "SUSPENDED"
                          ? "badge-error"
                          : "badge-warning"
                    }`}
                  >
                    {selectedBusiness.status}
                  </span>
                </DetailItem>
                <DetailItem label="Created">
                  {new Date(selectedBusiness.createdAt).toLocaleDateString()}
                </DetailItem>
                <DetailItem label="Users">
                  {selectedBusiness._count?.users || 0}
                </DetailItem>
                <DetailItem label="Outlets">
                  {selectedBusiness._count?.outlets || 0}
                </DetailItem>
                <DetailItem label="Products">
                  {selectedBusiness._count?.products || 0}
                </DetailItem>
                <DetailItem label="Customers">
                  {selectedBusiness._count?.customers || 0}
                </DetailItem>
              </div>
            </div>
            <div className="modal-footer">
              <Link to={`/super-admin/businesses`} className="btn-primary">
                Manage Business
              </Link>
              <button
                onClick={() => setSelectedBusiness(null)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, gradient, trend, warning }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "var(--radius-xl)",
        padding: "20px",
        boxShadow: "var(--shadow-sm)",
        border: "1px solid var(--gray-100)",
        transition: "all 0.2s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              color: "var(--gray-500)",
              fontSize: "12px",
              marginBottom: "6px",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: "26px",
              fontWeight: 700,
              background: gradient,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              lineHeight: 1,
            }}
          >
            {value.toLocaleString()}
          </div>
          {trend && (
            <div
              style={{
                fontSize: "11px",
                color: "var(--gray-500)",
                marginTop: "4px",
              }}
            >
              {trend}
            </div>
          )}
        </div>
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "var(--radius-lg)",
            background: gradient,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "22px",
            opacity: warning ? 1 : 0.9,
          }}
        >
          {icon}
        </div>
      </div>
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
          letterSpacing: "0.05em",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "15px", fontWeight: 500 }}>{children}</div>
    </div>
  );
}

export default SuperAdminDashboardPage;
