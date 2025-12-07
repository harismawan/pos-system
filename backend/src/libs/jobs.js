/**
 * Job enqueue helpers
 * Push jobs to Redis queues for background processing
 */

import { randomUUID } from "crypto";
import redis from "./redis.js";
import logger from "./logger.js";

const QUEUES = {
  AUDIT_LOG: "queue:audit_log",
  EMAIL_NOTIFICATION: "queue:email_notification",
  REPORT_GENERATION: "queue:report_generation",
};

/**
 * Enqueue a job to Redis (non-blocking)
 * @param {string} queueName - Name of the queue
 * @param {string} type - Job type
 * @param {Object} payload - Job payload
 * @param {Object} options - Additional options (maxAttempts, etc.)
 */
function enqueueJob(queueName, type, payload, options = {}) {
  const job = {
    id: randomUUID(),
    type,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
    maxAttempts: options.maxAttempts || 3,
  };

  // Fire and forget - don't await to make it non-blocking
  redis
    .lpush(queueName, JSON.stringify(job))
    .then(() => {
      logger.debug({ jobId: job.id, type, queueName }, "Job enqueued");
    })
    .catch((err) => {
      logger.error({ err, type, queueName }, "Failed to enqueue job");
    });

  return job.id;
}

/**
 * Enqueue an audit log job (non-blocking)
 * @param {Object} data - Audit log data
 */
export function enqueueAuditLogJob(data) {
  return enqueueJob(QUEUES.AUDIT_LOG, "AUDIT_LOG", data);
}

/**
 * Enqueue an email notification job (non-blocking)
 * @param {Object} data - Email data (to, subject, templateName, templateData, etc.)
 */
export function enqueueEmailNotificationJob(data) {
  return enqueueJob(QUEUES.EMAIL_NOTIFICATION, "EMAIL_NOTIFICATION", data);
}

/**
 * Enqueue a report generation job (non-blocking)
 * @param {Object} data - Report generation data (reportType, params, notifyEmail)
 */
export function enqueueReportJob(data) {
  return enqueueJob(QUEUES.REPORT_GENERATION, "REPORT_GENERATION", data);
}

export { QUEUES };
