import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";
import { useOutletStore } from "../../store/outletStore.js";
import * as reportsApi from "../../api/reportsApi.js";
import * as productsApi from "../../api/productsApi.js";
import * as inventoryApi from "../../api/inventoryApi.js";

const quickLinks = [
  {
    path: "/pos",
    label: "Open POS",
    icon: "🛒",
    color: "var(--success-500)",
    description: "Start selling",
  },
  {
    path: "/products",
    label: "Products",
    icon: "📦",
    color: "var(--primary-500)",
    description: "Manage catalog",
  },
  {
    path: "/inventory",
    label: "Inventory",
    icon: "📋",
    color: "var(--warning-500)",
    description: "Check stock",
  },
  {
    path: "/purchase-orders",
    label: "Purchase Orders",
    icon: "📝",
    color: "var(--info-500)",
    description: "Restock items",
  },
];

const features = [
  {
    icon: "🏪",
    title: "Multi-outlet",
    description: "Manage multiple store locations",
  },
  {
    icon: "💰",
    title: "Pricing Tiers",
    description: "Custom pricing for customer groups",
  },
  {
    icon: "📊",
    title: "Real-time Inventory",
    description: "Track stock movements instantly",
  },
  { icon: "📧", title: "Notifications", description: "Automated email alerts" },
];

function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const activeOutlet = useOutletStore((state) => state.activeOutlet);

  const [stats, setStats] = useState({
    totalSales: 0,
    ordersToday: 0,
    productsCount: 0,
    lowStockCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeOutlet) {
      loadDashboardData();
    } else {
      setStats({
        totalSales: 0,
        ordersToday: 0,
        productsCount: 0,
        lowStockCount: 0,
      });
      setLoading(false);
    }
  }, [activeOutlet]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get today's date range
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      ).toISOString();
      const endDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59,
        999,
      ).toISOString();

      const [salesData, productsData, lowStockData] = await Promise.all([
        reportsApi.getSalesSummary({ startDate, endDate }),
        productsApi.getProducts({ limit: 1 }),
        inventoryApi.getInventory({ lowStock: "true", limit: 1 }),
      ]);

      setStats({
        totalSales:
          salesData?.summary?.totalRevenue || salesData?.totalRevenue || 0,
        ordersToday:
          salesData?.summary?.totalOrders || salesData?.totalOrders || 0,
        productsCount: productsData?.pagination?.total || 0,
        lowStockCount: lowStockData?.pagination?.total || 0,
      });
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="page-container">
      {/* Welcome Header */}
      <div
        style={{
          background:
            "linear-gradient(135deg, var(--primary-500) 0%, var(--primary-700) 100%)",
          borderRadius: "var(--radius-xl)",
          padding: "32px",
          marginBottom: "24px",
          color: "white",
        }}
      >
        <div style={{ marginBottom: "8px", fontSize: "14px", opacity: 0.9 }}>
          {getGreeting()},
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "12px" }}>
          {user?.name || "User"}! 👋
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            fontSize: "14px",
          }}
        >
          <span
            style={{
              background: "rgba(255,255,255,0.2)",
              padding: "4px 12px",
              borderRadius: "var(--radius-full)",
            }}
          >
            {user?.role}
          </span>
          {activeOutlet ? (
            <span>📍 {activeOutlet.name}</span>
          ) : (
            <span style={{ opacity: 0.7 }}>No outlet selected</span>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>
          Quick Actions
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          {quickLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
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
                transition: "all var(--transition-fast)",
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
                  width: "48px",
                  height: "48px",
                  borderRadius: "var(--radius-lg)",
                  background: `${link.color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                }}
              >
                {link.icon}
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: "2px" }}>
                  {link.label}
                </div>
                <div style={{ fontSize: "13px", color: "var(--gray-500)" }}>
                  {link.description}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>
          Today's Overview
        </h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Sales</div>
            <div className="stat-value">
              {loading
                ? "..."
                : `Rp ${parseFloat(stats.totalSales).toLocaleString("id-ID")}`}
            </div>
            <div
              className="stat-change"
              style={{
                color:
                  stats.totalSales > 0
                    ? "var(--success-500)"
                    : "var(--gray-400)",
              }}
            >
              {stats.totalSales > 0 ? "Today" : "No sales yet"}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Orders</div>
            <div className="stat-value">
              {loading ? "..." : stats.ordersToday}
            </div>
            <div className="stat-change" style={{ color: "var(--gray-400)" }}>
              Today
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Products</div>
            <div className="stat-value">
              {loading ? "..." : stats.productsCount}
            </div>
            <div className="stat-change" style={{ color: "var(--gray-400)" }}>
              In catalog
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Low Stock</div>
            <div
              className="stat-value"
              style={{
                color:
                  stats.lowStockCount > 0 ? "var(--warning-500)" : "inherit",
              }}
            >
              {loading ? "..." : stats.lowStockCount}
            </div>
            <div
              className="stat-change"
              style={{
                color:
                  stats.lowStockCount > 0
                    ? "var(--warning-500)"
                    : "var(--gray-400)",
              }}
            >
              {stats.lowStockCount > 0 ? "Needs attention" : "Items"}
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">System Features</h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "24px",
          }}
        >
          {features.map((feature, index) => (
            <div key={index} style={{ display: "flex", gap: "12px" }}>
              <div style={{ fontSize: "24px" }}>{feature.icon}</div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                  {feature.title}
                </div>
                <div style={{ fontSize: "13px", color: "var(--gray-500)" }}>
                  {feature.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Getting Started */}
      {!activeOutlet && (
        <div
          style={{
            marginTop: "24px",
            padding: "24px",
            background: "var(--warning-50)",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--warning-500)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div style={{ fontSize: "32px" }}>💡</div>
          <div>
            <div
              style={{
                fontWeight: 600,
                color: "var(--warning-600)",
                marginBottom: "4px",
              }}
            >
              Get Started
            </div>
            <div style={{ fontSize: "14px", color: "var(--gray-600)" }}>
              Select an outlet from the dropdown in the header to start using
              the POS and manage inventory.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
