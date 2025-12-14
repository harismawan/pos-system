// Stress Test Scenario - Find breaking points
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
  // Stress test: Aggressive ramp up to 200 VUs to find breaking points
  stages: [
    { duration: "1m", target: 50 }, // Ramp up to 50
    { duration: "2m", target: 100 }, // Ramp up to 100
    { duration: "2m", target: 150 }, // Ramp up to 150
    { duration: "2m", target: 200 }, // Ramp up to 200
    { duration: "2m", target: 200 }, // Stay at 200
    { duration: "1m", target: 0 }, // Ramp down
  ],

  thresholds: {
    ...config.thresholds,
    // More lenient thresholds for stress testing
    http_req_failed: ["rate<0.10"], // Allow up to 10% failure
    http_req_duration: ["p(95)<2000"], // 2 second tolerance
  },

  tags: {
    scenario: "stress",
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
