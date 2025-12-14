import React, { useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore.js";
import { useOutletStore } from "../store/outletStore.js";
import { usePermissions, PERMISSIONS } from "../hooks/usePermissions.js";
import ProfileModal from "../components/auth/ProfileModal.jsx";
import ImpersonationBanner from "../components/ImpersonationBanner.jsx";

// SVG Icons
const icons = {
  dashboard: (
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
  pos: (
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
        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  ),
  products: (
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
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  ),
  inventory: (
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
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
      />
    </svg>
  ),
  warehouse: (
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
  purchaseOrders: (
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
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  reports: (
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
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
  settings: (
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
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
  shield: (
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
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  ),
  logout: (
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
  ),
  chevron: (
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
        d="M9 5l7 7-7 7"
      />
    </svg>
  ),
  store: (
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
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  ),
};

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, outlets, logout, isImpersonating } = useAuthStore();
  const { activeOutlet, setActiveOutlet } = useOutletStore();
  const { can, isSuperAdmin } = usePermissions();
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  // Build dynamic nav items based on permissions
  const navItems = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: icons.dashboard,
      description: "Overview & analytics",
    },
    can(PERMISSIONS.POS_ACCESS) && {
      path: "/pos",
      label: "POS",
      icon: icons.pos,
      description: "Point of sale",
    },
    can(PERMISSIONS.PRODUCTS_VIEW) && {
      path: "/products",
      label: "Products",
      icon: icons.products,
      description: "Manage catalog",
    },
    can(PERMISSIONS.INVENTORY_VIEW) && {
      path: "/inventory",
      label: "Inventory",
      icon: icons.inventory,
      description: "Stock levels",
    },
    can(PERMISSIONS.SETTINGS_WAREHOUSES) && {
      path: "/warehouses",
      label: "Warehouses",
      icon: icons.warehouse,
      description: "Storage locations",
    },
    can(PERMISSIONS.PURCHASE_VIEW) && {
      path: "/purchase-orders",
      label: "Purchase Orders",
      icon: icons.purchaseOrders,
      description: "Supplier orders",
    },
    can(PERMISSIONS.REPORTS_VIEW) && {
      label: "Reports",
      icon: icons.reports,
      description: "Business insights",
      children: [
        { path: "/reports", label: "Overview" },
        { path: "/reports/sales", label: "Sales" },
        { path: "/reports/orders", label: "Order History" },
        { path: "/reports/products", label: "Products" },
        { path: "/reports/inventory", label: "Inventory" },
      ],
    },
    {
      label: "Settings",
      icon: icons.settings,
      description: "Configuration",
      children: [
        { path: "/settings", label: "Overview" },
        can(PERMISSIONS.SETTINGS_OUTLETS) && {
          path: "/settings/outlets",
          label: "Outlets",
        },
        can(PERMISSIONS.SETTINGS_CUSTOMERS) && {
          path: "/settings/customers",
          label: "Customers",
        },
        can(PERMISSIONS.SETTINGS_SUPPLIERS) && {
          path: "/settings/suppliers",
          label: "Suppliers",
        },
        can(PERMISSIONS.USERS_VIEW) && {
          path: "/settings/users",
          label: "Users",
        },
        can(PERMISSIONS.SETTINGS_AUDIT) && {
          path: "/settings/audit-logs",
          label: "Audit Logs",
        },
      ].filter(Boolean),
    },
  ].filter(Boolean);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleOutletChange = (e) => {
    const outletId = e.target.value;
    const outlet = outlets.find((o) => o.id === outletId);
    setActiveOutlet(outlet || null);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const isParentActive = (children) => {
    return children?.some((child) => location.pathname === child.path);
  };

  return (
    <>
      <ImpersonationBanner />
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          paddingTop: isImpersonating ? "44px" : 0,
        }}
      >
        {/* Sidebar */}
        <aside
          style={{
            width: "280px",
            background:
              "linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
            color: "white",
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            position: "sticky",
            top: isImpersonating ? "44px" : 0,
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
                  background:
                    "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(96, 165, 250, 0.4)",
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
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <h2
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    background: "linear-gradient(135deg, #60a5fa, #a78bfa)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    letterSpacing: "-0.02em",
                  }}
                >
                  POS System
                </h2>
                <p
                  style={{
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.5)",
                    marginTop: "2px",
                  }}
                >
                  {activeOutlet?.name || "No outlet selected"}
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
                Menu
              </span>
            </div>
            {navItems.map((item, index) => (
              <div key={index}>
                {item.children ? (
                  <>
                    <button
                      onClick={() =>
                        setExpandedMenu(
                          expandedMenu === item.label ? null : item.label,
                        )
                      }
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        padding: "14px 16px",
                        marginBottom: "6px",
                        borderRadius: "12px",
                        color: isParentActive(item.children)
                          ? "white"
                          : "rgba(255,255,255,0.65)",
                        background:
                          expandedMenu === item.label ||
                          isParentActive(item.children)
                            ? "rgba(255,255,255,0.08)"
                            : "transparent",
                        border: "1px solid transparent",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: 500,
                        textAlign: "left",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <span
                        style={{
                          opacity: isParentActive(item.children) ? 1 : 0.7,
                        }}
                      >
                        {item.icon}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div>{item.label}</div>
                        {item.description && (
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
                        )}
                      </div>
                      <span
                        style={{
                          transform:
                            expandedMenu === item.label
                              ? "rotate(90deg)"
                              : "rotate(0)",
                          transition: "transform 0.2s",
                          opacity: 0.5,
                        }}
                      >
                        {icons.chevron}
                      </span>
                    </button>
                    {expandedMenu === item.label && (
                      <div
                        style={{
                          marginLeft: "20px",
                          marginBottom: "8px",
                          paddingLeft: "20px",
                          borderLeft: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        {item.children.map((child, childIndex) => (
                          <Link
                            key={childIndex}
                            to={child.path}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              padding: "10px 16px",
                              marginBottom: "2px",
                              borderRadius: "8px",
                              color: isActive(child.path)
                                ? "white"
                                : "rgba(255,255,255,0.55)",
                              background: isActive(child.path)
                                ? "linear-gradient(135deg, rgba(96, 165, 250, 0.25) 0%, rgba(167, 139, 250, 0.15) 100%)"
                                : "transparent",
                              textDecoration: "none",
                              fontSize: "13px",
                              fontWeight: isActive(child.path) ? 500 : 400,
                              transition: "all 0.2s",
                            }}
                          >
                            {isActive(child.path) && (
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  background: "#60a5fa",
                                  marginRight: "10px",
                                  boxShadow: "0 0 8px #60a5fa",
                                }}
                              />
                            )}
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.path}
                    onClick={() => setExpandedMenu(null)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      padding: "14px 16px",
                      marginBottom: "6px",
                      borderRadius: "12px",
                      color: isActive(item.path)
                        ? "white"
                        : "rgba(255,255,255,0.65)",
                      background: isActive(item.path)
                        ? "linear-gradient(135deg, rgba(96, 165, 250, 0.25) 0%, rgba(167, 139, 250, 0.15) 100%)"
                        : "transparent",
                      textDecoration: "none",
                      fontSize: "14px",
                      fontWeight: isActive(item.path) ? 600 : 500,
                      transition: "all 0.2s ease",
                      border: isActive(item.path)
                        ? "1px solid rgba(96, 165, 250, 0.2)"
                        : "1px solid transparent",
                      transform: isActive(item.path)
                        ? "translateX(4px)"
                        : "none",
                    }}
                  >
                    <span style={{ opacity: isActive(item.path) ? 1 : 0.7 }}>
                      {item.icon}
                    </span>
                    <div>
                      <div>{item.label}</div>
                      {item.description && (
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
                      )}
                    </div>
                    {isActive(item.path) && (
                      <div
                        style={{
                          marginLeft: "auto",
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "#60a5fa",
                          boxShadow: "0 0 8px #60a5fa",
                        }}
                      />
                    )}
                  </Link>
                )}
              </div>
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
            {isSuperAdmin && (
              <Link
                to="/super-admin"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 16px",
                  marginBottom: "12px",
                  background:
                    "linear-gradient(135deg, rgba(124, 58, 237, 0.25) 0%, rgba(91, 33, 182, 0.2) 100%)",
                  borderRadius: "10px",
                  border: "1px solid rgba(124, 58, 237, 0.3)",
                  color: "white",
                  textDecoration: "none",
                  fontSize: "13px",
                  fontWeight: 500,
                  transition: "all 0.2s ease",
                }}
              >
                {icons.shield}
                Super Admin Portal
              </Link>
            )}

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
                  background:
                    "linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  color: "white",
                  fontSize: "16px",
                  boxShadow: "0 4px 12px rgba(96, 165, 250, 0.3)",
                }}
              >
                {user?.name?.[0]?.toUpperCase() || "U"}
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
                  {user?.role?.replace(/_/g, " ")}
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
            background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
            minHeight: "100vh",
          }}
        >
          {/* Topbar */}
          <header
            style={{
              height: "70px",
              backgroundColor: "white",
              borderBottom: "1px solid var(--gray-200)",
              padding: "0 32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "8px 16px",
                  background: "var(--gray-50)",
                  borderRadius: "10px",
                  border: "1px solid var(--gray-200)",
                }}
              >
                <span style={{ color: "var(--gray-500)" }}>{icons.store}</span>
                <select
                  value={activeOutlet?.id || ""}
                  onChange={handleOutletChange}
                  style={{
                    padding: "4px 8px",
                    border: "none",
                    background: "transparent",
                    fontSize: "14px",
                    fontWeight: 500,
                    minWidth: "160px",
                    color: "var(--gray-800)",
                    cursor: "pointer",
                  }}
                >
                  <option value="">Select Outlet</option>
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </option>
                  ))}
                </select>
              </label>
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
                {icons.logout}
                Logout
              </button>
            </div>
          </header>

          {/* Page content */}
          <main
            style={{
              flex: 1,
              overflow: "auto",
            }}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}

export default AppLayout;
