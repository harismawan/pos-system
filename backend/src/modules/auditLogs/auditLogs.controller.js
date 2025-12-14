/**
 * Audit Logs controller - Route handlers
 */

import * as auditLogsService from "./auditLogs.service.js";
import logger from "../../libs/logger.js";
import { AUD } from "../../libs/responseCodes.js";
import { successResponse, errorResponse } from "../../libs/responses.js";

/**
 * Get audit logs with pagination and filters
 */
export async function getAuditLogsController({ query, store, set }) {
  try {
    const businessId = store.user.businessId;
    const result = await auditLogsService.getAuditLogs(
      {
        page: query.page,
        limit: query.limit,
        eventType: query.eventType,
        entityType: query.entityType,
        userId: query.userId,
        startDate: query.startDate,
        endDate: query.endDate,
      },
      businessId,
    );

    return successResponse(AUD.LIST_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Get audit logs failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(AUD.LIST_FAILED, message);
  }
}

/**
 * Get a single audit log by ID
 */
export async function getAuditLogByIdController({ params, store, set }) {
  try {
    const businessId = store.user.businessId;
    const log = await auditLogsService.getAuditLogById(params.id, businessId);

    if (!log) {
      set.status = 404;
      return errorResponse(AUD.NOT_FOUND, "Audit log not found");
    }

    return successResponse(AUD.GET_SUCCESS, log);
  } catch (err) {
    logger.error({ err }, "Get audit log by id failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(AUD.GET_FAILED, message);
  }
}

/**
 * Get distinct event types for filter dropdown
 */
export async function getEventTypesController({ store, set }) {
  try {
    const businessId = store.user.businessId;
    const eventTypes = await auditLogsService.getEventTypes(businessId);
    return successResponse(AUD.GET_TYPES_SUCCESS, { eventTypes });
  } catch (err) {
    logger.error({ err }, "Get event types failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(AUD.GET_TYPES_FAILED, message);
  }
}

/**
 * Get distinct entity types for filter dropdown
 */
export async function getEntityTypesController({ store, set }) {
  try {
    const businessId = store.user.businessId;
    const entityTypes = await auditLogsService.getEntityTypes(businessId);
    return successResponse(AUD.GET_TYPES_SUCCESS, { entityTypes });
  } catch (err) {
    logger.error({ err }, "Get entity types failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(AUD.GET_TYPES_FAILED, message);
  }
}
