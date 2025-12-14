import "../testSetup.js";
import { describe, it, expect, mock } from "bun:test";

function expectRoute(exported, prefix) {
  expect(exported).toBeDefined();
  const prefixValue = exported.router?.prefix ?? exported.config?.prefix;
  if (prefixValue) {
    expect(prefixValue).toBe(prefix);
  } else {
    expect(typeof exported.prefix).toBe("function");
  }
  expect(Array.isArray(exported.routes)).toBe(true);
  expect(exported.routes.length).toBeGreaterThan(0);
}

describe("routes definitions", () => {
  it("defines product routes", async () => {
    const { productsRoutes } =
      await import("../../src/modules/products/products.routes.js");
    expectRoute(productsRoutes, "/products");
  });

  it("defines pricing routes", async () => {
    const { pricingRoutes } =
      await import("../../src/modules/pricing/pricing.routes.js");
    expectRoute(pricingRoutes, "/pricing");
  });

  it("defines sales routes", async () => {
    const { salesRoutes } =
      await import("../../src/modules/sales/sales.routes.js");
    expectRoute(salesRoutes, "/sales");
  });

  it("defines customer routes", async () => {
    const { customersRoutes } =
      await import("../../src/modules/customers/customers.routes.js");
    expectRoute(customersRoutes, "/customers");
  });

  it("defines outlet routes", async () => {
    const { outletsRoutes } =
      await import("../../src/modules/outlets/outlets.routes.js");
    expectRoute(outletsRoutes, "/outlets");
  });

  it("defines warehouse routes", async () => {
    const { warehousesRoutes } =
      await import("../../src/modules/warehouses/warehouses.routes.js");
    expectRoute(warehousesRoutes, "/warehouses");
  });

  it("defines inventory routes", async () => {
    const { inventoryRoutes } =
      await import("../../src/modules/inventory/inventory.routes.js");
    expectRoute(inventoryRoutes, "/inventory");
  });

  it("defines supplier routes", async () => {
    const { suppliersRoutes } =
      await import("../../src/modules/suppliers/suppliers.routes.js");
    expectRoute(suppliersRoutes, "/suppliers");
  });

  it("defines purchase order routes", async () => {
    const { purchaseOrdersRoutes } =
      await import("../../src/modules/purchaseOrders/purchaseOrders.routes.js");
    expectRoute(purchaseOrdersRoutes, "/purchase-orders");
  });

  it("defines reports routes", async () => {
    const { reportsRoutes } =
      await import("../../src/modules/reports/reports.routes.js");
    expectRoute(reportsRoutes, "/reports");
  });

  it("defines users routes", async () => {
    const { usersRoutes } =
      await import("../../src/modules/users/users.routes.js");
    expectRoute(usersRoutes, "/users");
  });

  it("defines audit logs routes", async () => {
    const { auditLogsRoutes } =
      await import("../../src/modules/auditLogs/auditLogs.routes.js");
    expectRoute(auditLogsRoutes, "/audit-logs");
  });

  it("defines auth routes", async () => {
    const { authRoutes } =
      await import("../../src/modules/auth/auth.routes.js");
    expectRoute(authRoutes, "/auth");
  });
});
