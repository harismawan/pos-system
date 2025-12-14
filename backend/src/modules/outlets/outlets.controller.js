/**
 * Outlets controller
 */

import * as outletsService from "./outlets.service.js";
import logger from "../../libs/logger.js";
import { OUT } from "../../libs/responseCodes.js";
import { successResponse, errorResponse } from "../../libs/responses.js";
import { enqueueAuditLogJob, createAuditLogData } from "../../libs/jobs.js";

export async function getOutletsController({ query, store, set }) {
  try {
    const businessId = store.user.businessId;
    const result = await outletsService.getOutlets({ ...query, businessId });

    return successResponse(OUT.LIST_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Get outlets failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(OUT.LIST_FAILED, message);
  }
}

export async function getOutletByIdController({ params, store, set }) {
  try {
    const businessId = store.user.businessId;
    const outlet = await outletsService.getOutletById(params.id, businessId);

    return successResponse(OUT.GET_SUCCESS, outlet);
  } catch (err) {
    logger.error({ err }, "Get outlet failed");
    set.status =
      err.statusCode || (err.message === "Outlet not found" ? 404 : 500);
    const code = set.status === 404 ? OUT.NOT_FOUND : OUT.LIST_FAILED;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(code, message);
  }
}

export async function createOutletController({ body, store, set }) {
  try {
    const userId = store.user.id;
    const businessId = store.user.businessId;
    const outlet = await outletsService.createOutlet(body, userId, businessId);

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "OUTLET_CREATED",
        outletId: outlet.id,
        entityType: "Outlet",
        entityId: outlet.id,
        payload: {
          name: outlet.name,
          code: outlet.code,
        },
      }),
    );

    set.status = 201;
    return successResponse(OUT.CREATE_SUCCESS, outlet);
  } catch (err) {
    logger.error({ err }, "Create outlet failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(OUT.CREATE_FAILED, message);
  }
}

export async function updateOutletController({ params, body, store, set }) {
  try {
    const userId = store.user.id;
    const businessId = store.user.businessId;
    const outlet = await outletsService.updateOutlet(
      params.id,
      body,
      userId,
      businessId,
    );

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "OUTLET_UPDATED",
        outletId: outlet.id,
        entityType: "Outlet",
        entityId: outlet.id,
        payload: {
          name: outlet.name,
          code: outlet.code,
        },
      }),
    );

    return successResponse(OUT.UPDATE_SUCCESS, outlet);
  } catch (err) {
    logger.error({ err }, "Update outlet failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(OUT.UPDATE_FAILED, message);
  }
}

export async function deleteOutletController({ params, store, set }) {
  try {
    const businessId = store.user.businessId;
    const result = await outletsService.deleteOutlet(params.id, businessId);

    return successResponse(OUT.DELETE_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Delete outlet failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(OUT.DELETE_FAILED, message);
  }
}

export async function getOutletUsersController({ params, set }) {
  try {
    const users = await outletsService.getOutletUsers(params.id);

    return successResponse(OUT.GET_USERS_SUCCESS, users);
  } catch (err) {
    logger.error({ err }, "Get outlet users failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(OUT.GET_USERS_FAILED, message);
  }
}

export async function assignUserToOutletController({
  params,
  body,
  store,
  set,
}) {
  try {
    const adminUserId = store.user.id;
    const outletUser = await outletsService.assignUserToOutlet(
      { ...body, outletId: params.id },
      adminUserId,
    );

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "USER_ASSIGNED_TO_OUTLET",
        outletId: params.id,
        entityType: "OutletUser",
        entityId: outletUser.id,
        payload: {
          assignedUserId: body.userId,
          outletRole: body.outletRole,
        },
      }),
    );

    set.status = 201;
    return successResponse(OUT.ASSIGN_USER_SUCCESS, outletUser);
  } catch (err) {
    logger.error({ err }, "Assign user to outlet failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(OUT.ASSIGN_FAILED, message);
  }
}

export async function removeUserFromOutletController({ params, store, set }) {
  try {
    const adminUserId = store.user.id;
    const result = await outletsService.removeUserFromOutlet(
      params.userId,
      params.id,
      adminUserId,
    );

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "USER_REMOVED_FROM_OUTLET",
        outletId: params.id,
        entityType: "OutletUser",
        entityId: `${params.userId}-${params.id}`,
        payload: {
          removedUserId: params.userId,
        },
      }),
    );

    return successResponse(OUT.REMOVE_USER_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Remove user from outlet failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(OUT.REMOVE_FAILED, message);
  }
}
