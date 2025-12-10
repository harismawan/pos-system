import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import * as reportsApi from "../../api/reportsApi.js";
import { useUiStore } from "../../store/uiStore.js";
import ProductDetailModal from "../../components/products/ProductDetailModal.jsx";
import {
  HourlyHeatmap,
  PeriodComparison,
} from "../../components/charts/index.js";

function ReportsPage() {
  const showNotification = useUiStore((state) => state.showNotification);
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [heatmapData, setHeatmapData] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get last 30 days data
      const endDate = new Date().toISOString();
      const startDate = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const [trendData, productsData, heatmap] = await Promise.all([
        reportsApi.getSalesTrend({
          startDate,
          endDate,
          groupBy: "day",
          compareWithPrevious: true,
        }),
        reportsApi.getTopProducts({ startDate, endDate, limit: 5 }),
        reportsApi.getHourlySalesHeatmap({ startDate, endDate }),
      ]);

      setSalesData(trendData);
      setTopProducts(productsData.products || []);
      setHeatmapData(heatmap);
    } catch (err) {
      // Error handled centrally
    } finally {
      setLoading(false);
    }
  };

  const reportCards = [
    {
      path: "/reports/sales",
      label: "Sales Report",
      icon: "📊",
      color: "var(--primary-500)",
      description: "Revenue, orders, and trends",
    },
    {
      path: "/reports/orders",
      label: "Order History",
      icon: "📝",
      color: "var(--success-500)",
      description: "View all transactions",
    },
    {
      path: "/reports/products",
      label: "Products Report",
      icon: "🏆",
      color: "var(--warning-500)",
      description: "Best selling items",
    },
    {
      path: "/reports/inventory",
      label: "Inventory Report",
      icon: "📦",
      color: "var(--info-500)",
      description: "Stock valuation",
    },
  ];

  const currentTotals = salesData?.current?.totals;
  const comparison = salesData?.comparison;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports Dashboard</h1>
          <p className="page-subtitle">Business analytics and insights</p>
        </div>
      </div>

      {/* Quick Stats */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px" }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }}></div>
          <p style={{ color: "var(--gray-500)" }}>Loading reports...</p>
        </div>
      ) : (
        <>
          {/* Stats Cards - same style as SalesReportPage */}
          <div style={{ marginBottom: "32px" }}>
            <PeriodComparison
              current={currentTotals}
              previous={salesData?.previous?.totals}
              comparison={comparison}
              showComparison={!!comparison}
            />
          </div>

          {/* Report Navigation */}
          <h2
            style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}
          >
            Detailed Reports
          </h2>

          {/* Sales Heatmap */}
          {heatmapData && (
            <div className="card" style={{ marginBottom: "24px" }}>
              <div className="card-header">
                <h2 className="card-title">Sales by Hour (30 days)</h2>
              </div>
              <div style={{ padding: "16px" }}>
                <HourlyHeatmap data={heatmapData} />
              </div>
            </div>
          )}

          {/* Top Products */}
          {topProducts.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Top Selling Products (30 days)</h2>
                <Link
                  to="/reports/products"
                  style={{ fontSize: "14px", color: "var(--primary-500)" }}
                >
                  View All →
                </Link>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--gray-100)" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 0",
                        color: "var(--gray-500)",
                        fontWeight: 500,
                        fontSize: "13px",
                      }}
                    >
                      Product
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "12px 0",
                        color: "var(--gray-500)",
                        fontWeight: 500,
                        fontSize: "13px",
                      }}
                    >
                      Qty Sold
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "12px 0",
                        color: "var(--gray-500)",
                        fontWeight: 500,
                        fontSize: "13px",
                      }}
                    >
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((item, index) => (
                    <tr
                      key={item.product.id}
                      style={{
                        borderBottom: "1px solid var(--gray-100)",
                        cursor: "pointer",
                        transition: "background-color 0.15s",
                      }}
                      onClick={() => handleProductClick(item.product)}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          "var(--gray-50)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      <td style={{ padding: "12px 0" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                          }}
                        >
                          <span
                            style={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "var(--radius-full)",
                              background:
                                index < 3
                                  ? "var(--warning-500)"
                                  : "var(--gray-200)",
                              color: index < 3 ? "white" : "var(--gray-600)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "12px",
                              fontWeight: 600,
                            }}
                          >
                            {index + 1}
                          </span>
                          <div>
                            <div style={{ fontWeight: 500 }}>
                              {item.product.name}
                            </div>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "var(--gray-400)",
                              }}
                            >
                              {item.product.sku}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", padding: "12px 0" }}>
                        {Math.round(item.totalQuantity)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "12px 0",
                          fontWeight: 500,
                        }}
                      >
                        Rp {item.totalRevenue.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <ProductDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        product={selectedProduct}
      />
    </div>
  );
}

export default ReportsPage;
