// /**
//  * Tests for Prometheus Metrics Service
//  */

// import { describe, test, expect, beforeEach, mock, spyOn } from "bun:test";

// // Mock config
// mock.module("../../src/config/index.js", () => ({
//   default: {
//     metrics: { enabled: true },
//     loki: { enabled: false },
//     nodeEnv: "test",
//   },
// }));

// // Import after mocking
// const {
//   recordHttpRequest,
//   updateDbPoolMetrics,
//   recordDbQuery,
//   recordOrder,
//   recordSale,
//   getMetrics,
//   getMetricsContentType,
//   isMetricsEnabled,
//   httpRequestsTotal,
//   httpResponseCodesTotal,
//   dbPoolSize,
//   ordersTotal,
//   salesAmountTotal,
// } = await import("../../src/libs/metrics.js");

// describe("Metrics Service", () => {
//   describe("isMetricsEnabled", () => {
//     test("should return true when metrics are enabled", () => {
//       expect(isMetricsEnabled()).toBe(true);
//     });
//   });

//   describe("getMetricsContentType", () => {
//     test("should return prometheus content type", () => {
//       const contentType = getMetricsContentType();
//       expect(contentType).toContain("text/plain");
//     });
//   });

//   describe("getMetrics", () => {
//     test("should return metrics in prometheus format", async () => {
//       const metrics = await getMetrics();
//       expect(typeof metrics).toBe("string");
//       expect(metrics).toContain("pos_backend");
//     });
//   });

//   describe("recordHttpRequest", () => {
//     test("should record HTTP request metrics", async () => {
//       // Record a request
//       recordHttpRequest("GET", "/api/products", 200, 50, "PRD-200-001");

//       // Get metrics and verify
//       const metrics = await getMetrics();
//       expect(metrics).toContain("pos_backend_http_requests_total");
//       expect(metrics).toContain("pos_backend_http_request_duration_seconds");
//     });

//     test("should normalize paths with IDs", async () => {
//       recordHttpRequest("GET", "/api/products/123", 200, 25);
//       recordHttpRequest(
//         "GET",
//         "/api/products/550e8400-e29b-41d4-a716-446655440000",
//         200,
//         30,
//       );

//       const metrics = await getMetrics();
//       expect(metrics).toContain("pos_backend_http_requests_total");
//     });
//   });

//   describe("recordHttpRequest with response codes", () => {
//     test("should track custom response codes", async () => {
//       recordHttpRequest("POST", "/api/auth/login", 200, 100, "AUT-200-001");
//       recordHttpRequest("POST", "/api/auth/login", 401, 50, "AUT-401-001");

//       const metrics = await getMetrics();
//       expect(metrics).toContain("pos_backend_http_response_codes_total");
//     });
//   });

//   describe("updateDbPoolMetrics", () => {
//     test("should update database pool metrics", async () => {
//       updateDbPoolMetrics(10, 5, 5);

//       const metrics = await getMetrics();
//       expect(metrics).toContain("pos_backend_db_pool_size");
//     });
//   });

//   describe("recordDbQuery", () => {
//     test("should record database query metrics", async () => {
//       recordDbQuery("select", 15, true);
//       recordDbQuery("insert", 25, true);
//       recordDbQuery("update", 20, false);

//       const metrics = await getMetrics();
//       expect(metrics).toContain("pos_backend_db_query_duration_seconds");
//       expect(metrics).toContain("pos_backend_db_queries_total");
//     });
//   });

//   describe("recordOrder", () => {
//     test("should record order metrics", async () => {
//       recordOrder("completed");
//       recordOrder("cancelled");

//       const metrics = await getMetrics();
//       expect(metrics).toContain("pos_backend_orders_total");
//     });
//   });

//   describe("recordSale", () => {
//     test("should record sales amount", async () => {
//       recordSale(150000, "IDR");
//       recordSale(75000, "IDR");

//       const metrics = await getMetrics();
//       expect(metrics).toContain("pos_backend_sales_amount_total");
//     });
//   });
// });

// describe("Metrics Disabled", () => {
//   test("should not throw when metrics are disabled", () => {
//     // Functions should be no-ops when disabled
//     // This is a basic sanity check
//     expect(() => {
//       recordHttpRequest("GET", "/test", 200, 10);
//       updateDbPoolMetrics(5, 2, 3);
//       recordDbQuery("select", 5);
//       recordOrder("completed");
//       recordSale(100);
//     }).not.toThrow();
//   });
// });
