import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore.js";
import AuthLayout from "../layouts/AuthLayout.jsx";
import AppLayout from "../layouts/AppLayout.jsx";

// Lazy-loaded Auth pages
const LoginPage = lazy(() => import("../pages/auth/LoginPage.jsx"));

// Lazy-loaded Main pages
const DashboardPage = lazy(
  () => import("../pages/dashboard/DashboardPage.jsx"),
);
const PosScreen = lazy(() => import("../pages/pos/PosScreen.jsx"));

// Lazy-loaded Products
const ProductsListPage = lazy(
  () => import("../pages/products/ProductsListPage.jsx"),
);
const ProductFormPage = lazy(
  () => import("../pages/products/ProductFormPage.jsx"),
);

// Lazy-loaded Inventory
const InventoryOverviewPage = lazy(
  () => import("../pages/inventory/InventoryOverviewPage.jsx"),
);

// Lazy-loaded Warehouses
const WarehousesListPage = lazy(
  () => import("../pages/warehouses/WarehousesListPage.jsx"),
);
const WarehouseFormPage = lazy(
  () => import("../pages/warehouses/WarehouseFormPage.jsx"),
);

// Lazy-loaded Purchase Orders
const PurchaseOrdersListPage = lazy(
  () => import("../pages/purchase-orders/PurchaseOrdersListPage.jsx"),
);
const PurchaseOrderFormPage = lazy(
  () => import("../pages/purchase-orders/PurchaseOrderFormPage.jsx"),
);
const PurchaseOrderDetailPage = lazy(
  () => import("../pages/purchase-orders/PurchaseOrderDetailPage.jsx"),
);

// Lazy-loaded Settings
const SettingsPage = lazy(() => import("../pages/settings/SettingsPage.jsx"));
const CustomersSettingsPage = lazy(
  () => import("../pages/settings/CustomersSettingsPage.jsx"),
);
const OutletsSettingsPage = lazy(
  () => import("../pages/settings/OutletsSettingsPage.jsx"),
);
const SuppliersSettingsPage = lazy(
  () => import("../pages/settings/SuppliersSettingsPage.jsx"),
);
const UsersSettingsPage = lazy(
  () => import("../pages/settings/UsersSettingsPage.jsx"),
);
const AuditLogsSettingsPage = lazy(
  () => import("../pages/settings/AuditLogsSettingsPage.jsx"),
);

// Lazy-loaded Reports
const ReportsPage = lazy(() => import("../pages/reports/ReportsPage.jsx"));
const SalesReportPage = lazy(
  () => import("../pages/reports/SalesReportPage.jsx"),
);
const OrderHistoryPage = lazy(
  () => import("../pages/reports/OrderHistoryPage.jsx"),
);
const ProductsReportPage = lazy(
  () => import("../pages/reports/ProductsReportPage.jsx"),
);
const InventoryReportPage = lazy(
  () => import("../pages/reports/InventoryReportPage.jsx"),
);

// Loading fallback component
function PageLoader() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "400px",
        gap: "16px",
      }}
    >
      <div className="spinner" style={{ width: "40px", height: "40px" }}></div>
      <p style={{ color: "var(--gray-500)", fontSize: "14px" }}>Loading...</p>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pos" element={<PosScreen />} />

          {/* Products */}
          <Route path="/products" element={<ProductsListPage />} />
          <Route path="/products/new" element={<ProductFormPage />} />
          <Route path="/products/:id/edit" element={<ProductFormPage />} />

          {/* Inventory */}
          <Route path="/inventory" element={<InventoryOverviewPage />} />

          {/* Warehouses */}
          <Route path="/warehouses" element={<WarehousesListPage />} />
          <Route path="/warehouses/new" element={<WarehouseFormPage />} />
          <Route path="/warehouses/:id/edit" element={<WarehouseFormPage />} />

          {/* Purchase Orders */}
          <Route path="/purchase-orders" element={<PurchaseOrdersListPage />} />
          <Route
            path="/purchase-orders/new"
            element={<PurchaseOrderFormPage />}
          />
          <Route
            path="/purchase-orders/:id"
            element={<PurchaseOrderDetailPage />}
          />
          <Route
            path="/purchase-orders/:id/edit"
            element={<PurchaseOrderFormPage />}
          />

          {/* Settings */}
          <Route path="/settings" element={<SettingsPage />}>
            <Route path="customers" element={<CustomersSettingsPage />} />
            <Route path="outlets" element={<OutletsSettingsPage />} />
            <Route path="suppliers" element={<SuppliersSettingsPage />} />
            <Route path="users" element={<UsersSettingsPage />} />
            <Route path="audit-logs" element={<AuditLogsSettingsPage />} />
          </Route>

          {/* Reports */}
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/reports/sales" element={<SalesReportPage />} />
          <Route path="/reports/orders" element={<OrderHistoryPage />} />
          <Route path="/reports/products" element={<ProductsReportPage />} />
          <Route path="/reports/inventory" element={<InventoryReportPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
