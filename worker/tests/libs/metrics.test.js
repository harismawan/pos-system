// /**
//  * Tests for Worker Prometheus Metrics Service
//  */

// import { describe, test, expect, mock } from "bun:test";

// // Mock config
// mock.module("../../src/config/index.js", () => ({
//   default: {
//     metrics: { enabled: true, port: 9100 },
//     loki: { enabled: false },
//     nodeEnv: "test",
//   },
// }));

// // Import after mocking
// const {
//   startJobProcessing,
//   endJobProcessing,
//   recordJobRetry,
//   updateQueueDepth,
//   updateDbPoolMetrics,
//   recordDbQuery,
//   getMetrics,
//   getMetricsContentType,
//   isMetricsEnabled,
//   getMetricsPort,
// } = await import("../../src/libs/metrics.js");

// describe("Worker Metrics Service", () => {
//   describe("isMetricsEnabled", () => {
//     test("should return true when metrics are enabled", () => {
//       expect(isMetricsEnabled()).toBe(true);
//     });
//   });

//   describe("getMetricsPort", () => {
//     test("should return configured metrics port", () => {
//       expect(getMetricsPort()).toBe(9100);
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
//       expect(metrics).toContain("pos_worker");
//     });
//   });

//   describe("Job Processing Metrics", () => {
//     test("should track job processing start and end", async () => {
//       const startTime = startJobProcessing("AUDIT_LOG");
//       expect(startTime).toBeGreaterThan(0);

//       // Simulate job completion
//       endJobProcessing("AUDIT_LOG", startTime, true);

//       const metrics = await getMetrics();
//       expect(metrics).toContain("pos_worker_jobs_total");
//       expect(metrics).toContain("pos_worker_job_processing_duration_seconds");
//     });

//     test("should track failed jobs", async () => {
//       const startTime = startJobProcessing("EMAIL_NOTIFICATION");
//       endJobProcessing("EMAIL_NOTIFICATION", startTime, false);

//       const metrics = await getMetrics();
//       expect(metrics).toContain("pos_worker_jobs_total");
//     });

//     test("should track job retries", async () => {
//       recordJobRetry("AUDIT_LOG");
//       recordJobRetry("AUDIT_LOG");

//       const metrics = await getMetrics();
//       expect(metrics).toContain("pos_worker_job_retries_total");
//     });
//   });

//   describe("Queue Metrics", () => {
//     test("should update queue depth", async () => {
//       updateQueueDepth("queue:audit_log", 5);
//       updateQueueDepth("queue:email_notification", 10);

//       const metrics = await getMetrics();
//       expect(metrics).toContain("pos_worker_queue_depth");
//     });
//   });

//   describe("Database Metrics", () => {
//     test("should update database pool metrics", async () => {
//       updateDbPoolMetrics(5, 2, 3);

//       const metrics = await getMetrics();
//       expect(metrics).toContain("pos_worker_db_pool_size");
//     });

//     test("should record database query metrics", async () => {
//       recordDbQuery("select", 10, true);
//       recordDbQuery("insert", 15, false);

//       const metrics = await getMetrics();
//       expect(metrics).toContain("pos_worker_db_query_duration_seconds");
//       expect(metrics).toContain("pos_worker_db_queries_total");
//     });
//   });
// });

// describe("Worker Metrics Disabled", () => {
//   test("should not throw when metrics are disabled", () => {
//     expect(() => {
//       const startTime = startJobProcessing("TEST_JOB");
//       endJobProcessing("TEST_JOB", startTime, true);
//       recordJobRetry("TEST_JOB");
//       updateQueueDepth("test_queue", 0);
//       updateDbPoolMetrics(1, 0, 1);
//       recordDbQuery("select", 5);
//     }).not.toThrow();
//   });
// });
