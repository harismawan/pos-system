/**
 * Worker main entry point
 * Processes jobs from Redis queues with concurrency, priority, and dead letter queue support
 */

import redis from "./libs/redis.js";
import logger from "./libs/logger.js";
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

// Configuration
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || "3", 10);
const BRPOP_TIMEOUT = 5; // seconds

// Queue definitions with priority (lower number = higher priority)
const QUEUES = {
  AUDIT_LOG: { name: "queue:audit_log", priority: 1 },
  EMAIL_NOTIFICATION: { name: "queue:email_notification", priority: 2 },
  REPORT_GENERATION: { name: "queue:report_generation", priority: 3 },
};

// Dead letter queue
const DEAD_LETTER_QUEUE = "queue:dead_letter";

// Get queue names in priority order (for BRPOP - first queue has highest priority)
const PRIORITY_ORDERED_QUEUES = Object.values(QUEUES)
  .sort((a, b) => a.priority - b.priority)
  .map((q) => q.name);

const JOB_HANDLERS = {
  AUDIT_LOG: handleAuditLogJob,
  EMAIL_NOTIFICATION: handleEmailNotificationJob,
  REPORT_GENERATION: handleReportGenerationJob,
};

// Track active workers for graceful shutdown
let activeWorkers = 0;
let isShuttingDown = false;

/**
 * Move job to dead letter queue after max retries
 */
async function moveToDeadLetterQueue(job, error) {
  const deadLetterJob = {
    ...job,
    failedAt: new Date().toISOString(),
    error: error.message,
    stack: error.stack,
  };

  try {
    await redis.lpush(DEAD_LETTER_QUEUE, JSON.stringify(deadLetterJob));
    logger.warn(
      { jobId: job.id, type: job.type, error: error.message },
      "Job moved to dead letter queue",
    );
  } catch (err) {
    logger.error(
      { err, jobId: job.id },
      "Failed to move job to dead letter queue",
    );
  }
}

/**
 * Process a job
 */
async function processJob(job) {
  const { id, type, payload, attempts = 1, maxAttempts = 3 } = job;

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

      // Re-queue for retry with exponential backoff delay metadata
      const queueConfig = Object.values(QUEUES).find((q) =>
        q.name.includes(type.toLowerCase().replace(/_/g, "_")),
      );

      if (queueConfig) {
        job.retryAfter = Date.now() + Math.pow(2, attempts) * 1000; // Exponential backoff
        await redis.lpush(queueConfig.name, JSON.stringify(job));
        logger.info(
          {
            jobId: id,
            type,
            attempt: job.attempts,
            retryAfter: job.retryAfter,
          },
          "Job re-queued for retry",
        );
      }
    } else {
      // Move to dead letter queue after max retries
      await moveToDeadLetterQueue(job, err);
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
    for (const { name: queueName } of Object.values(QUEUES)) {
      const depth = await redis.llen(queueName);
      updateQueueDepth(queueName, depth);
    }
    // Also track dead letter queue depth
    const dlqDepth = await redis.llen(DEAD_LETTER_QUEUE);
    updateQueueDepth(DEAD_LETTER_QUEUE, dlqDepth);
  } catch (err) {
    logger.debug({ err }, "Failed to update queue metrics");
  }
}

/**
 * Single worker loop - one of multiple concurrent workers
 */
async function workerLoop(workerId) {
  logger.info({ workerId }, "Worker thread started");

  while (!isShuttingDown) {
    try {
      // Block and pop from queues in priority order (BRPOP respects queue order)
      const result = await redis.brpop(
        ...PRIORITY_ORDERED_QUEUES,
        BRPOP_TIMEOUT,
      );

      if (!result) {
        // Timeout, continue loop
        continue;
      }

      const [queueName, jobData] = result;
      const job = JSON.parse(jobData);

      // Check if job should be delayed (retry backoff)
      if (job.retryAfter && Date.now() < job.retryAfter) {
        // Re-queue the job - it's not ready yet
        await redis.lpush(queueName, JSON.stringify(job));
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }

      logger.debug(
        { queueName, jobId: job.id, workerId },
        "Job popped from queue",
      );

      // Update queue metrics after popping
      updateQueueMetrics();

      // Process job
      activeWorkers++;
      try {
        await processJob(job);
      } finally {
        activeWorkers--;
      }
    } catch (err) {
      logger.error({ err, workerId }, "Worker loop error");
      // Wait a bit before retrying to avoid tight loop on persistent errors
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  logger.info({ workerId }, "Worker thread stopped");
}

/**
 * Start multiple concurrent workers
 */
async function startWorkers() {
  logger.info({ concurrency: WORKER_CONCURRENCY }, "Starting workers");
  logger.info(
    `Listening on queues (priority order): ${PRIORITY_ORDERED_QUEUES.join(", ")}`,
  );
  logger.info(`Dead letter queue: ${DEAD_LETTER_QUEUE}`);

  // Update queue metrics every 10 seconds
  const metricsInterval = setInterval(updateQueueMetrics, 10000);
  updateQueueMetrics(); // Initial update

  // Start concurrent workers
  const workerPromises = [];
  for (let i = 0; i < WORKER_CONCURRENCY; i++) {
    workerPromises.push(workerLoop(i + 1));
  }

  // Wait for all workers to complete (they won't unless shutting down)
  await Promise.all(workerPromises);

  clearInterval(metricsInterval);
}

// Graceful shutdown
async function gracefulShutdown(signal) {
  logger.info({ signal, activeWorkers }, "Worker shutting down...");
  isShuttingDown = true;

  // Wait for active jobs to complete (max 30 seconds)
  const maxWait = 30000;
  const startTime = Date.now();

  while (activeWorkers > 0 && Date.now() - startTime < maxWait) {
    logger.info({ activeWorkers }, "Waiting for active jobs to complete...");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (activeWorkers > 0) {
    logger.warn({ activeWorkers }, "Forcing shutdown with active workers");
  }

  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

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
        return new Response(
          JSON.stringify({
            status: "ok",
            activeWorkers,
            isShuttingDown,
            concurrency: WORKER_CONCURRENCY,
          }),
          {
            headers: { "content-type": "application/json" },
          },
        );
      }

      // Dead letter queue info
      if (url.pathname === "/dlq") {
        try {
          const dlqDepth = await redis.llen(DEAD_LETTER_QUEUE);
          return new Response(
            JSON.stringify({
              queue: DEAD_LETTER_QUEUE,
              depth: dlqDepth,
            }),
            {
              headers: { "content-type": "application/json" },
            },
          );
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  logger.info(`Metrics server listening on port ${port}`);
  return server;
}

// Initialize and start the worker
async function init() {
  logger.info("=".repeat(50));
  logger.info("Worker initializing...");
  logger.info(`Concurrency: ${WORKER_CONCURRENCY}`);
  logger.info("=".repeat(50));

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

  // Start the workers
  await startWorkers();
}

init().catch((err) => {
  logger.error({ err }, "Worker failed to start");
  process.exit(1);
});
