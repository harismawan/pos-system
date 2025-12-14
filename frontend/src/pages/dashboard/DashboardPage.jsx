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
        reportsApi.getSalesTrend({ startDate, endDate }),
        productsApi.getProducts({ limit: 1 }),
        inventoryApi.getInventory({ lowStock: "true", limit: 1 }),
      ]);

      setStats({
        totalSales:
          salesData?.current?.totals?.revenue ||
          salesData?.summary?.totalRevenue ||
          salesData?.totalRevenue ||
          0,
        ordersToday:
          salesData?.current?.totals?.orders ||
          salesData?.summary?.totalOrders ||
          salesData?.totalOrders ||
          0,
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
      {/* Hero Header */}
      <div
        style={{
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
          borderRadius: "var(--radius-xl)",
          padding: "32px",
          marginBottom: "24px",
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
            {user?.name || "User"}! 👋
          </h1>
          <p style={{ fontSize: "13px", opacity: 0.8, maxWidth: "500px" }}>
            {activeOutlet
              ? `You're managing ${activeOutlet.name}. Here's your daily overview.`
              : "Select an outlet to view your daily stats and start selling."}
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginTop: "20px",
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
              <span style={{ fontSize: "14px" }}>👤</span>
              {user?.role}
            </div>
            {activeOutlet && (
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
                <span style={{ fontSize: "14px" }}>📍</span>
                {activeOutlet.name}
              </div>
            )}
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
