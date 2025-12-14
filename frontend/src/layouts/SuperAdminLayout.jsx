import React, { useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore.js";
import ProfileModal from "../components/auth/ProfileModal.jsx";

function SuperAdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [showProfile, setShowProfile] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);

  const navItems = [
    {
      path: "/super-admin",
      label: "Dashboard",
      icon: (
        <svg
          width="20"
          height="20"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z"
          />
        </svg>
      ),
      description: "Overview & metrics",
    },
    {
      path: "/super-admin/businesses",
      label: "Businesses",
      icon: (
        <svg
          width="20"
          height="20"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
      description: "Manage all businesses",
    },
    {
      path: "/super-admin/users",
      label: "Users",
      icon: (
        <svg
          width="20"
          height="20"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
      description: "All platform users",
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (path) => {
    if (path === "/super-admin") {
      return location.pathname === "/super-admin";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        style={{
          width: "280px",
          background:
            "linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)",
          color: "white",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          position: "sticky",
          top: 0,
          boxShadow: "4px 0 24px rgba(0, 0, 0, 0.15)",
        }}
      >
        {/* Logo Section */}
        <div
          style={{
            padding: "24px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(167, 139, 250, 0.4)",
              }}
            >
              <svg
                width="22"
                height="22"
                fill="none"
                viewBox="0 0 24 24"
                stroke="white"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "white",
                  letterSpacing: "-0.02em",
                }}
              >
                Super Admin
              </h2>
              <p
                style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.5)",
                  marginTop: "2px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Platform Control
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "20px 16px", overflowY: "auto" }}>
          <div style={{ marginBottom: "8px", padding: "0 12px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Management
            </span>
          </div>
          {navItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "14px 16px",
                marginBottom: "6px",
                borderRadius: "12px",
                color: isActive(item.path) ? "white" : "rgba(255,255,255,0.65)",
                background: isActive(item.path)
                  ? "linear-gradient(135deg, rgba(167, 139, 250, 0.3) 0%, rgba(124, 58, 237, 0.2) 100%)"
                  : "transparent",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: isActive(item.path) ? 600 : 500,
                transition: "all 0.2s ease",
                border: isActive(item.path)
                  ? "1px solid rgba(167, 139, 250, 0.3)"
                  : "1px solid transparent",
                transform: isActive(item.path) ? "translateX(4px)" : "none",
              }}
            >
              <span
                style={{
                  opacity: isActive(item.path) ? 1 : 0.7,
                  transition: "opacity 0.2s",
                }}
              >
                {item.icon}
              </span>
              <div>
                <div>{item.label}</div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.4)",
                    marginTop: "2px",
                    fontWeight: 400,
                  }}
                >
                  {item.description}
                </div>
              </div>
              {isActive(item.path) && (
                <div
                  style={{
                    marginLeft: "auto",
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#a78bfa",
                    boxShadow: "0 0 8px #a78bfa",
                  }}
                />
              )}
            </Link>
          ))}
        </nav>

        {/* Footer Section */}
        <div
          style={{
            padding: "20px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(0,0,0,0.15)",
          }}
        >
          {/* Back to App Link */}
          <Link
            to="/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 16px",
              marginBottom: "12px",
              background: "rgba(255,255,255,0.08)",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "white",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 500,
              transition: "all 0.2s ease",
            }}
          >
            <svg
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to App
          </Link>

          {/* User Profile Button */}
          <button
            onClick={() => setShowProfile(true)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px",
              background: "rgba(255,255,255,0.05)",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                color: "white",
                fontSize: "16px",
                boxShadow: "0 4px 12px rgba(251, 191, 36, 0.3)",
              }}
            >
              {user?.name?.[0]?.toUpperCase() || "S"}
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "14px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: "white",
                }}
              >
                {user?.name}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.45)",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#22c55e",
                  }}
                />
                Super Admin
              </div>
            </div>
            <svg
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="rgba(255,255,255,0.4)"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </aside>

      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg, #faf5ff 0%, #f5f3ff 100%)",
          minHeight: "100vh",
        }}
      >
        {/* Topbar */}
        <header
          style={{
            height: "70px",
            backgroundColor: "white",
            borderBottom: "1px solid rgba(139, 92, 246, 0.1)",
            padding: "0 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(139, 92, 246, 0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
                color: "white",
                padding: "6px 16px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.05em",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 2px 8px rgba(124, 58, 237, 0.3)",
              }}
            >
              <svg
                width="14"
                height="14"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              SUPER ADMIN MODE
            </div>
            <span style={{ color: "var(--gray-400)", fontSize: "13px" }}>
              Full platform access enabled
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                background: "white",
                border: "1px solid var(--gray-200)",
                borderRadius: "8px",
                color: "var(--gray-700)",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Logout
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: "auto" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default SuperAdminLayout;
