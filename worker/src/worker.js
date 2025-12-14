/**
 * Worker main entry point
 * Processes jobs from Redis queues
 */

import redis from "./libs/redis.js";
import logger from "./libs/logger.js";
import config from "./config/index.js";
import prisma from "./libs/prisma.js";
import { handleAuditLogJob } from "./jobs/auditLog.job.js";
import { handleEmailNotificationJob } from "./jobs/emailNotification.job.js";
import { handleReportGenerationJob } from "./jobs/reportGeneration.job.js";
import {
  startJobProcessing,
  endJobProcessing,
  recordJobRetry,
  updateQueueDepth,
  getMetrics,
  getMetricsContentType,
  isMetricsEnabled,
  getMetricsPort,
} from "./libs/metrics.js";

const QUEUES = {
  AUDIT_LOG: "queue:audit_log",
  EMAIL_NOTIFICATION: "queue:email_notification",
  REPORT_GENERATION: "queue:report_generation",
};

const JOB_HANDLERS = {
  AUDIT_LOG: handleAuditLogJob,
  EMAIL_NOTIFICATION: handleEmailNotificationJob,
  REPORT_GENERATION: handleReportGenerationJob,
};

/**
 * Process a job
 */
async function processJob(job) {
  const { id, type, payload, attempts, maxAttempts } = job;

  logger.info({ jobId: id, type, attempts }, "Processing job");

  // Start metrics tracking
  const startTime = startJobProcessing(type);

  try {
    const handler = JOB_HANDLERS[type];

    if (!handler) {
      throw new Error(`No handler for job type: ${type}`);
    }

    await handler(payload);

    // Record successful job
    endJobProcessing(type, startTime, true);
    logger.info({ jobId: id, type }, "Job completed successfully");
  } catch (err) {
    // Record failed job
    endJobProcessing(type, startTime, false);
    logger.error({ err, jobId: id, type, attempts }, "Job processing failed");

    // Retry logic
    if (attempts < maxAttempts) {
      job.attempts = attempts + 1;
      recordJobRetry(type);

      // Re-queue for retry
      const queueName = Object.values(QUEUES).find((q) =>
        q.includes(type.toLowerCase().replace(/_/g, "_")),
      );

      if (queueName) {
        await redis.lpush(queueName, JSON.stringify(job));
        logger.info(
          { jobId: id, type, attempt: job.attempts },
          "Job re-queued for retry",
        );
      }
    } else {
      logger.error(
        { jobId: id, type, attempts },
        "Job failed permanently after max retries",
      );
    }

    throw err;
  }
}

/**
 * Update queue depth metrics periodically
 */
async function updateQueueMetrics() {
  if (!isMetricsEnabled()) return;

  try {
    for (const [name, queueName] of Object.entries(QUEUES)) {
      const depth = await redis.llen(queueName);
      updateQueueDepth(queueName, depth);
    }
  } catch (err) {
    logger.debug({ err }, "Failed to update queue metrics");
  }
}

/**
 * Worker loop
 */
async function startWorker() {
  logger.info("Worker started");
  logger.info(`Listening on queues: ${Object.values(QUEUES).join(", ")}`);

  // Update queue metrics every 10 seconds
  const metricsInterval = setInterval(updateQueueMetrics, 10000);
  updateQueueMetrics(); // Initial update

  while (true) {
    try {
      // Block and pop from any of the queues (BRPOP with 5 second timeout)
      const result = await redis.brpop(...Object.values(QUEUES), 5);

      if (!result) {
        // Timeout, continue loop
        continue;
      }

      const [queueName, jobData] = result;
      const job = JSON.parse(jobData);

      logger.debug({ queueName, jobId: job.id }, "Job popped from queue");

      // Update queue metrics after popping
      updateQueueMetrics();

      // Process job
      await processJob(job);
    } catch (err) {
      logger.error({ err }, "Worker loop error");
      // Wait a bit before retrying to avoid tight loop on persistent errors
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Worker shutting down...");
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Worker shutting down...");
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

/**
 * Start metrics HTTP server
 */
async function startMetricsServer() {
  if (!isMetricsEnabled()) {
    logger.info("Metrics disabled, skipping metrics server");
    return null;
  }

  const port = getMetricsPort();

  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === "/metrics") {
        const metrics = await getMetrics();
        return new Response(metrics, {
          headers: { "content-type": getMetricsContentType() },
        });
      }

      if (url.pathname === "/health") {
        return new Response(JSON.stringify({ status: "ok" }), {
          headers: { "content-type": "application/json" },
        });
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  logger.info(`Metrics server listening on port ${port}`);
  return server;
}

// Initialize and start the worker
async function init() {
  // Test database connection
  try {
    await prisma.$connect();
    logger.info("Database connected");
  } catch (err) {
    logger.error({ err }, "Failed to connect to database");
    process.exit(1);
  }

  // Test Redis connection
  try {
    await redis.ping();
    logger.info("Redis connected");
  } catch (err) {
    logger.error({ err }, "Failed to connect to Redis");
    process.exit(1);
  }

  // Start metrics server
  await startMetricsServer();

  // Start the worker
  await startWorker();
}

init().catch((err) => {
  logger.error({ err }, "Worker failed to start");
  process.exit(1);
});
