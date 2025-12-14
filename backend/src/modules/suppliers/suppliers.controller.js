/**
 * Suppliers controller
 */

import * as suppliersService from "./suppliers.service.js";
import logger from "../../libs/logger.js";
import { SUP } from "../../libs/responseCodes.js";
import { successResponse, errorResponse } from "../../libs/responses.js";
import { enqueueAuditLogJob, createAuditLogData } from "../../libs/jobs.js";

export async function getSuppliersController({ query, store, set }) {
  try {
    const businessId = store.user.businessId;

    // Parse isActive from string to boolean if provided
    const filters = { ...query, businessId };
    if (filters.isActive !== undefined) {
      filters.isActive =
        filters.isActive === "true" || filters.isActive === true;
    }

    const result = await suppliersService.getSuppliers(filters);

    return successResponse(SUP.LIST_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Get suppliers failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(SUP.LIST_FAILED, message);
  }
}

export async function getSupplierByIdController({ params, store, set }) {
  try {
    const businessId = store.user.businessId;
    const supplier = await suppliersService.getSupplierById(
      params.id,
      businessId,
    );

    return successResponse(SUP.GET_SUCCESS, supplier);
  } catch (err) {
    logger.error({ err }, "Get supplier failed");
    set.status =
      err.statusCode || (err.message === "Supplier not found" ? 404 : 500);
    const code = set.status === 404 ? SUP.NOT_FOUND : SUP.LIST_FAILED;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(code, message);
  }
}

export async function createSupplierController({ body, store, set }) {
  try {
    const businessId = store.user.businessId;
    const supplier = await suppliersService.createSupplier(body, businessId);

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "SUPPLIER_CREATED",
        outletId: null,
        entityType: "Supplier",
        entityId: supplier.id,
        payload: {
          name: supplier.name,
          phone: supplier.phone,
          email: supplier.email,
        },
      }),
    );

    set.status = 201;
    return successResponse(SUP.CREATE_SUCCESS, supplier);
  } catch (err) {
    logger.error({ err }, "Create supplier failed");
    set.status = err.statusCode || 400;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(SUP.CREATE_FAILED, message);
  }
}

export async function updateSupplierController({ params, body, store, set }) {
  try {
    const businessId = store.user.businessId;
    const supplier = await suppliersService.updateSupplier(
      params.id,
      body,
      businessId,
    );

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "SUPPLIER_UPDATED",
        outletId: null,
        entityType: "Supplier",
        entityId: params.id,
        payload: {
          changes: Object.keys(body),
        },
      }),
    );

    return successResponse(SUP.UPDATE_SUCCESS, supplier);
  } catch (err) {
    logger.error({ err }, "Update supplier failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(SUP.UPDATE_FAILED, message);
  }
}

export async function deleteSupplierController({ params, store, set }) {
  try {
    const businessId = store.user.businessId;
    const result = await suppliersService.deleteSupplier(params.id, businessId);

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "SUPPLIER_DELETED",
        outletId: null,
        entityType: "Supplier",
        entityId: params.id,
        payload: {},
      }),
    );

    return successResponse(SUP.DELETE_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Delete supplier failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(SUP.DELETE_FAILED, message);
  }
}
