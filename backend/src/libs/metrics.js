/**
 * Prometheus Metrics Service
 * Provides HTTP, database, and resource metrics
 *
 * When METRICS_ENABLED=false, no metrics are collected (zero overhead)
 */

import config from "../config/index.js";

// Check if metrics are enabled BEFORE importing prom-client
const metricsEnabled = config.metrics?.enabled ?? true;

// Only import and initialize prom-client if metrics are enabled
let client = null;
let register = null;
let httpRequestDuration = null;
let httpRequestsTotal = null;
let httpResponseCodesTotal = null;
let httpActiveConnections = null;
let dbPoolSize = null;
let dbQueryDuration = null;
let dbQueriesTotal = null;
let dbSlowQueriesTotal = null;
let ordersTotal = null;
let salesAmountTotal = null;

if (metricsEnabled) {
  // Dynamically import prom-client only when metrics are enabled
  client = await import("prom-client");

  // Create a registry
  register = new client.default.Registry();

  // Add default metrics (CPU, memory, event loop lag, etc.)
  client.default.collectDefaultMetrics({
    register,
    prefix: "pos_backend_",
  });

  // ============================================
  // HTTP Metrics
  // ============================================

  /**
   * HTTP request duration histogram
   * Labels: method, path, status
   */
  httpRequestDuration = new client.default.Histogram({
    name: "pos_backend_http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "path", "status"],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register],
  });

  /**
   * HTTP request counter
   * Labels: method, path, status
   */
  httpRequestsTotal = new client.default.Counter({
    name: "pos_backend_http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "path", "status"],
    registers: [register],
  });

  /**
   * HTTP response code counter
   * Labels: http_status, response_code (custom codes like AUT-200-001)
   */
  httpResponseCodesTotal = new client.default.Counter({
    name: "pos_backend_http_response_codes_total",
    help: "Total number of HTTP responses by status and response code",
    labelNames: ["http_status", "response_code"],
    registers: [register],
  });

  /**
   * Active HTTP connections gauge
   */
  httpActiveConnections = new client.default.Gauge({
    name: "pos_backend_http_active_connections",
    help: "Number of active HTTP connections",
    registers: [register],
  });

  // ============================================
  // Database Metrics
  // ============================================

  /**
   * Database connection pool size gauge
   */
  dbPoolSize = new client.default.Gauge({
    name: "pos_backend_db_pool_size",
    help: "Database connection pool size",
    labelNames: ["state"], // total, active, idle
    registers: [register],
  });

  /**
   * Database query duration histogram
   */
  dbQueryDuration = new client.default.Histogram({
    name: "pos_backend_db_query_duration_seconds",
    help: "Duration of database queries in seconds",
    labelNames: ["operation"], // select, insert, update, delete
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [register],
  });

  /**
   * Database query counter
   */
  dbQueriesTotal = new client.default.Counter({
    name: "pos_backend_db_queries_total",
    help: "Total number of database queries",
    labelNames: ["operation", "status"], // success, error
    registers: [register],
  });

  /**
   * Slow queries counter (queries > 100ms)
   */
  dbSlowQueriesTotal = new client.default.Counter({
    name: "pos_backend_db_slow_queries_total",
    help: "Total number of slow database queries (> 100ms)",
    labelNames: ["operation"],
    registers: [register],
  });

  // ============================================
  // Business Metrics
  // ============================================

  /**
   * Orders counter
   */
  ordersTotal = new client.default.Counter({
    name: "pos_backend_orders_total",
    help: "Total number of orders created",
    labelNames: ["status"], // completed, cancelled, pending
    registers: [register],
  });

  /**
   * Sales amount counter
   */
  salesAmountTotal = new client.default.Counter({
    name: "pos_backend_sales_amount_total",
    help: "Total sales amount in currency units",
    labelNames: ["currency"],
    registers: [register],
  });
}

// ============================================
// Helper Functions (no-op when disabled)
// ============================================

/**
 * Normalize path to reduce cardinality
 * Replaces dynamic segments with placeholders
 */
function normalizePath(path) {
  return (
    path
      // Remove query strings
      .split("?")[0]
      // Replace UUIDs
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        ":id",
      )
      // Replace numeric IDs
      .replace(/\/\d+/g, "/:id")
      // Remove trailing slashes
      .replace(/\/$/, "") || "/"
  );
}

/**
 * Record HTTP request metrics
 */
export function recordHttpRequest(
  method,
  path,
  status,
  durationMs,
  responseCode = null,
) {
  if (!metricsEnabled) return;

  const normalizedPath = normalizePath(path);
  const durationSeconds = durationMs / 1000;

  httpRequestDuration.observe(
    { method, path: normalizedPath, status },
    durationSeconds,
  );
  httpRequestsTotal.inc({ method, path: normalizedPath, status });

  if (responseCode) {
    httpResponseCodesTotal.inc({
      http_status: status.toString(),
      response_code: responseCode,
    });
  }
}

/**
 * Increment active connections
 */
export function incrementActiveConnections() {
  if (!metricsEnabled) return;
  httpActiveConnections.inc();
}

/**
 * Decrement active connections
 */
export function decrementActiveConnections() {
  if (!metricsEnabled) return;
  httpActiveConnections.dec();
}

/**
 * Update database pool metrics
 */
export function updateDbPoolMetrics(total, active, idle) {
  if (!metricsEnabled) return;

  dbPoolSize.set({ state: "total" }, total);
  dbPoolSize.set({ state: "active" }, active);
  dbPoolSize.set({ state: "idle" }, idle);
}

/**
 * Record database query metrics
 */
export function recordDbQuery(operation, durationMs, success = true) {
  if (!metricsEnabled) return;

  const durationSeconds = durationMs / 1000;
  dbQueryDuration.observe({ operation }, durationSeconds);
  dbQueriesTotal.inc({ operation, status: success ? "success" : "error" });
}

/**
 * Record slow query
 */
export function recordSlowQuery(operation) {
  if (!metricsEnabled) return;
  dbSlowQueriesTotal.inc({ operation });
}

/**
 * Record order creation
 */
export function recordOrder(status) {
  if (!metricsEnabled) return;
  ordersTotal.inc({ status });
}

/**
 * Record sales amount
 */
export function recordSale(amount, currency = "IDR") {
  if (!metricsEnabled) return;
  salesAmountTotal.inc({ currency }, amount);
}

/**
 * Get metrics in Prometheus format
 */
export async function getMetrics() {
  if (!metricsEnabled) return "";
  return register.metrics();
}

/**
 * Get metrics content type
 */
export function getMetricsContentType() {
  if (!metricsEnabled) return "text/plain";
  return register.contentType;
}

/**
 * Check if metrics are enabled
 */
export function isMetricsEnabled() {
  return metricsEnabled;
}

// Export metrics objects (may be null if disabled)
export {
  httpRequestDuration,
  httpRequestsTotal,
  httpResponseCodesTotal,
  httpActiveConnections,
  dbPoolSize,
  dbQueryDuration,
  dbQueriesTotal,
  ordersTotal,
  salesAmountTotal,
};

export default {
  register,
  httpRequestDuration,
  httpRequestsTotal,
  httpResponseCodesTotal,
  httpActiveConnections,
  dbPoolSize,
  dbQueryDuration,
  dbQueriesTotal,
  ordersTotal,
  salesAmountTotal,
  recordHttpRequest,
  incrementActiveConnections,
  decrementActiveConnections,
  updateDbPoolMetrics,
  recordDbQuery,
  recordOrder,
  recordSale,
  getMetrics,
  getMetricsContentType,
  isMetricsEnabled,
};
