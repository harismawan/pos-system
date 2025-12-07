/**
 * Audit Logs API client
 */

import apiClient from "./client.js";

/**
 * Get audit logs with pagination and filters
 */
export async function getAuditLogs(params = {}) {
  const response = await apiClient.get("/audit-logs", params);
  return response.data;
}

/**
 * Get a single audit log by ID
 */
export async function getAuditLogById(id) {
  const response = await apiClient.get(`/audit-logs/${id}`);
  return response.data;
}

/**
 * Get available event types for filtering
 */
export async function getEventTypes() {
  const response = await apiClient.get("/audit-logs/event-types");
  return response.data;
}

/**
 * Get available entity types for filtering
 */
export async function getEntityTypes() {
  const response = await apiClient.get("/audit-logs/entity-types");
  return response.data;
}
