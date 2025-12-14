/**
 * Prometheus Metrics Service for Worker
 * Provides job processing, database, and resource metrics
 *
 * When METRICS_ENABLED=false, no metrics are collected (zero overhead)
 */

import config from "../config/index.js";

// Check if metrics are enabled BEFORE importing prom-client
const metricsEnabled = config.metrics?.enabled ?? true;

// Only import and initialize prom-client if metrics are enabled
let client = null;
let register = null;
let jobProcessingDuration = null;
let jobsTotal = null;
let queueDepth = null;
let activeJobs = null;
let jobRetriesTotal = null;
let dbPoolSize = null;
let dbQueryDuration = null;
let dbQueriesTotal = null;
let dbSlowQueriesTotal = null;

if (metricsEnabled) {
  // Dynamically import prom-client only when metrics are enabled
  client = await import("prom-client");

  // Create a registry
  register = new client.default.Registry();

  // Add default metrics (CPU, memory, event loop lag, etc.)
  client.default.collectDefaultMetrics({
    register,
    prefix: "pos_worker_",
  });

  // ============================================
  // Job Processing Metrics
  // ============================================

  /**
   * Job processing duration histogram
   * Labels: job_type
   */
  jobProcessingDuration = new client.default.Histogram({
    name: "pos_worker_job_processing_duration_seconds",
    help: "Duration of job processing in seconds",
    labelNames: ["job_type"],
    buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30, 60, 120],
    registers: [register],
  });

  /**
   * Job counter
   * Labels: job_type, status (success/failure)
   */
  jobsTotal = new client.default.Counter({
    name: "pos_worker_jobs_total",
    help: "Total number of jobs processed",
    labelNames: ["job_type", "status"],
    registers: [register],
  });

  /**
   * Queue depth gauge
   * Labels: queue_name
   */
  queueDepth = new client.default.Gauge({
    name: "pos_worker_queue_depth",
    help: "Current depth of job queues",
    labelNames: ["queue_name"],
    registers: [register],
  });

  /**
   * Active jobs gauge
   */
  activeJobs = new client.default.Gauge({
    name: "pos_worker_active_jobs",
    help: "Number of jobs currently being processed",
    labelNames: ["job_type"],
    registers: [register],
  });

  /**
   * Job retries counter
   */
  jobRetriesTotal = new client.default.Counter({
    name: "pos_worker_job_retries_total",
    help: "Total number of job retries",
    labelNames: ["job_type"],
    registers: [register],
  });

  // ============================================
  // Database Metrics
  // ============================================

  /**
   * Database connection pool size gauge
   */
  dbPoolSize = new client.default.Gauge({
    name: "pos_worker_db_pool_size",
    help: "Database connection pool size",
    labelNames: ["state"], // total, active, idle
    registers: [register],
  });

  /**
   * Database query duration histogram
   */
  dbQueryDuration = new client.default.Histogram({
    name: "pos_worker_db_query_duration_seconds",
    help: "Duration of database queries in seconds",
    labelNames: ["operation"],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [register],
  });

  /**
   * Database query counter
   */
  dbQueriesTotal = new client.default.Counter({
    name: "pos_worker_db_queries_total",
    help: "Total number of database queries",
    labelNames: ["operation", "status"],
    registers: [register],
  });

  /**
   * Slow queries counter (queries > 100ms)
   */
  dbSlowQueriesTotal = new client.default.Counter({
    name: "pos_worker_db_slow_queries_total",
    help: "Total number of slow database queries (> 100ms)",
    labelNames: ["operation"],
    registers: [register],
  });
}

// ============================================
// Helper Functions (no-op when disabled)
// ============================================

/**
 * Record job processing start
 */
export function startJobProcessing(jobType) {
  if (!metricsEnabled) return null;

  activeJobs.inc({ job_type: jobType });
  return performance.now();
}

/**
 * Record job processing completion
 */
export function endJobProcessing(jobType, startTime, success = true) {
  if (!metricsEnabled) return;

  activeJobs.dec({ job_type: jobType });

  if (startTime) {
    const durationSeconds = (performance.now() - startTime) / 1000;
    jobProcessingDuration.observe({ job_type: jobType }, durationSeconds);
  }

  jobsTotal.inc({ job_type: jobType, status: success ? "success" : "failure" });
}

/**
 * Record job retry
 */
export function recordJobRetry(jobType) {
  if (!metricsEnabled) return;
  jobRetriesTotal.inc({ job_type: jobType });
}

/**
 * Update queue depth
 */
export function updateQueueDepth(queueName, depth) {
  if (!metricsEnabled) return;
  queueDepth.set({ queue_name: queueName }, depth);
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

/**
 * Get metrics port
 */
export function getMetricsPort() {
  return config.metrics?.port ?? 9100;
}

export default {
  register,
  jobProcessingDuration,
  jobsTotal,
  queueDepth,
  activeJobs,
  jobRetriesTotal,
  dbPoolSize,
  dbQueryDuration,
  dbQueriesTotal,
  startJobProcessing,
  endJobProcessing,
  recordJobRetry,
  updateQueueDepth,
  updateDbPoolMetrics,
  recordDbQuery,
  getMetrics,
  getMetricsContentType,
  isMetricsEnabled,
  getMetricsPort,
};
