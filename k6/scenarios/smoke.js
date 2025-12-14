// Smoke Test Scenario - Quick validation of all endpoints
import { authTests } from "../tests/auth.k6.js";
import { usersTests } from "../tests/users.k6.js";
import { productsTests } from "../tests/products.k6.js";
import { pricingTests } from "../tests/pricing.k6.js";
import { customersTests } from "../tests/customers.k6.js";
import { outletsTests } from "../tests/outlets.k6.js";
import { warehousesTests } from "../tests/warehouses.k6.js";
import { inventoryTests } from "../tests/inventory.k6.js";
import { suppliersTests } from "../tests/suppliers.k6.js";
import { purchaseOrdersTests } from "../tests/purchase-orders.k6.js";
import { posTests } from "../tests/pos.k6.js";
import { reportsTests } from "../tests/reports.k6.js";
import { auditLogsTests } from "../tests/audit-logs.k6.js";
import { superAdminTests } from "../tests/super-admin.k6.js";
import { invitationsTests } from "../tests/invitations.k6.js";
import { logout } from "../helpers/auth.js";
import { getSummary } from "../helpers/reporting.js";
import config from "../config.js";

export const options = {
  // Smoke test: 1-3 virtual users for a short duration
  vus: 1,
  duration: "30s",

  thresholds: config.thresholds,

  // Tags for better reporting
  tags: {
    scenario: "smoke",
  },
};

export default function () {
  // Run all test suites sequentially
  authTests();
  usersTests();
  productsTests();
  pricingTests();
  customersTests();
  outletsTests();
  warehousesTests();
  inventoryTests();
  suppliersTests();
  purchaseOrdersTests();
  posTests();
  reportsTests();
  auditLogsTests();
  superAdminTests();
  invitationsTests();

  // Logout at the very end of the scenario
  logout();
}

export function handleSummary(data) {
  return getSummary(data);
}
