/**
 * Users controller - Route handlers
 */

import * as usersService from "./users.service.js";
import { enqueueAuditLogJob, createAuditLogData } from "../../libs/jobs.js";
import {
  AUDIT_EVENT_TYPES,
  AUDIT_ENTITY_TYPES,
} from "../../libs/auditConstants.js";
import logger from "../../libs/logger.js";
import { USR } from "../../libs/responseCodes.js";
import { successResponse, errorResponse } from "../../libs/responses.js";

export async function getUsersController({ query, store, set }) {
  try {
    const { page, limit, search, role, isActive } = query;
    const businessId = store.user.businessId;

    const result = await usersService.getUsers({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      search,
      role,
      isActive,
      businessId,
    });

    return successResponse(USR.LIST_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Get users failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(USR.LIST_FAILED, message);
  }
}

export async function getUserByIdController({ params, store, set }) {
  try {
    const businessId = store.user.businessId;
    const user = await usersService.getUserById(params.id, businessId);

    if (!user) {
      set.status = 404;
      return errorResponse(USR.NOT_FOUND, "User not found");
    }

    return successResponse(USR.GET_SUCCESS, { user });
  } catch (err) {
    logger.error({ err }, "Get user by id failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(USR.GET_FAILED, message);
  }
}

export async function createUserController({ body, store, set }) {
  try {
    const businessId = store.user.businessId;
    const user = await usersService.createUser({ ...body, businessId });

    // Audit log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: AUDIT_EVENT_TYPES.USER_CREATED,
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: user.id,
        payload: { name: user.name, username: user.username, role: user.role },
      }),
    );

    set.status = 201;
    return successResponse(USR.CREATE_SUCCESS, { user });
  } catch (err) {
    logger.error({ err }, "Create user failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(USR.CREATE_FAILED, message);
  }
}

export async function updateUserController({ params, body, store, set }) {
  try {
    const businessId = store.user.businessId;
    const user = await usersService.updateUser(params.id, body, businessId);

    // Audit log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: AUDIT_EVENT_TYPES.USER_UPDATED,
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: user.id,
        payload: { changes: Object.keys(body) },
      }),
    );

    return successResponse(USR.UPDATE_SUCCESS, { user });
  } catch (err) {
    logger.error({ err }, "Update user failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(USR.UPDATE_FAILED, message);
  }
}

export async function deleteUserController({ params, store, set }) {
  try {
    const businessId = store.user.businessId;
    await usersService.deleteUser(params.id, store.user?.id, businessId);

    // Audit log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: AUDIT_EVENT_TYPES.USER_DELETED,
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: params.id,
        payload: {},
      }),
    );

    return successResponse(USR.DELETE_SUCCESS, null);
  } catch (err) {
    logger.error({ err }, "Delete user failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(USR.DELETE_FAILED, message);
  }
}

export async function assignOutletController({ params, body, store, set }) {
  try {
    const outletUser = await usersService.assignUserToOutlet(
      params.id,
      body.outletId,
      body.outletRole,
      body.isDefault,
    );

    // Audit log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: AUDIT_EVENT_TYPES.USER_OUTLET_ASSIGNED,
        entityType: AUDIT_ENTITY_TYPES.OUTLET_USER,
        entityId: outletUser.id,
        payload: { userId: params.id, outletRole: body.outletRole },
      }),
    );

    return successResponse(USR.ASSIGN_OUTLET_SUCCESS, { outletUser });
  } catch (err) {
    logger.error({ err }, "Assign outlet failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(USR.ASSIGN_OUTLET_FAILED, message);
  }
}

export async function removeOutletController({ params, store, set }) {
  try {
    await usersService.removeUserFromOutlet(params.id, params.outletId);

    // Audit log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: AUDIT_EVENT_TYPES.USER_OUTLET_REMOVED,
        entityType: AUDIT_ENTITY_TYPES.OUTLET_USER,
        entityId: `${params.id}_${params.outletId}`,
        payload: { userId: params.id },
      }),
    );

    return successResponse(USR.REMOVE_OUTLET_SUCCESS, null);
  } catch (err) {
    logger.error({ err }, "Remove outlet failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(USR.REMOVE_OUTLET_FAILED, message);
  }
}
