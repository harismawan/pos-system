// Load Test Scenario - Normal expected load simulation
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
  // Load test: Gradual ramp up to 50 VUs
  stages: [
    { duration: "30s", target: 10 }, // Ramp up to 10 users
    { duration: "1m", target: 25 }, // Ramp up to 25 users
    { duration: "2m", target: 50 }, // Ramp up to 50 users
    { duration: "1m", target: 50 }, // Stay at 50 users
    { duration: "30s", target: 0 }, // Ramp down to 0 users
  ],

  thresholds: {
    ...config.thresholds,
    // Slightly stricter for load test
    http_req_duration: ["p(95)<800", "p(99)<1500"],
  },

  tags: {
    scenario: "load",
  },
};

export default function () {
  // Run all test suites
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
  logout();
}

export function handleSummary(data) {
  return getSummary(data);
}
