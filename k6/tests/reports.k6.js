// Reports API Performance Tests
import http from "k6/http";
import { check, group } from "k6";
import config from "../config.js";
import {
  ensureAuthenticated,
  getAuthHeaders,
  getAuthHeadersWithOutlet,
} from "../helpers/auth.js";
import { thinkTime } from "../helpers/http.js";

export function reportsTests() {
  ensureAuthenticated();
  const headers = getAuthHeaders();
  const headersWithOutlet = getAuthHeadersWithOutlet();

  // Date range for reports (last 30 days)
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  group("Reports API", () => {
    // Sales trend
    group("GET /reports/sales-trend", () => {
      const res = http.get(
        `${config.baseUrl}/reports/sales-trend?startDate=${startDate}&endDate=${endDate}&groupBy=day`,
        { headers: headersWithOutlet },
      );
      check(res, {
        "sales trend status is 200": (r) => r.status === 200,
        "sales trend returns data": (r) => r.json().data !== undefined,
      });
      thinkTime();
    });

    // Hourly heatmap
    group("GET /reports/hourly-heatmap", () => {
      const res = http.get(
        `${config.baseUrl}/reports/hourly-heatmap?startDate=${startDate}&endDate=${endDate}`,
        { headers: headersWithOutlet },
      );
      check(res, {
        "hourly heatmap status is 200": (r) => r.status === 200,
      });
      thinkTime();
    });

    // Top products
    group("GET /reports/top-products", () => {
      const res = http.get(
        `${config.baseUrl}/reports/top-products?startDate=${startDate}&endDate=${endDate}&limit=10`,
        { headers: headersWithOutlet },
      );
      check(res, {
        "top products status is 200": (r) => r.status === 200,
      });
      thinkTime();
    });

    // Inventory valuation
    group("GET /reports/inventory-valuation", () => {
      const res = http.get(`${config.baseUrl}/reports/inventory-valuation`, {
        headers: headersWithOutlet,
      });
      check(res, {
        "inventory valuation status is 200": (r) => r.status === 200,
      });
      thinkTime();
    });

    // Stock movements report
    group("GET /reports/stock-movements", () => {
      const res = http.get(
        `${config.baseUrl}/reports/stock-movements?startDate=${startDate}&endDate=${endDate}&page=1&limit=50`,
        { headers: headersWithOutlet },
      );
      check(res, {
        "stock movements report status is 200": (r) => r.status === 200,
      });
      thinkTime();
    });

    // Order history
    group("GET /reports/order-history", () => {
      const res = http.get(
        `${config.baseUrl}/reports/order-history?startDate=${startDate}&endDate=${endDate}&page=1&limit=50`,
        { headers: headersWithOutlet },
      );
      check(res, {
        "order history status is 200": (r) => r.status === 200,
      });
      thinkTime();
    });
  });
}

export default reportsTests;
