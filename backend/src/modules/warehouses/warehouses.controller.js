/**
 * Warehouses controller
 */

import * as warehousesService from "./warehouses.service.js";
import logger from "../../libs/logger.js";
import { WAR } from "../../libs/responseCodes.js";
import { successResponse, errorResponse } from "../../libs/responses.js";

export async function getWarehousesController({ query, store, set }) {
  try {
    const businessId = store.user.businessId;
    const result = await warehousesService.getWarehouses(query, businessId);

    return successResponse(WAR.LIST_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Get warehouses failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(WAR.LIST_FAILED, message);
  }
}

export async function getWarehouseByIdController({ params, store, set }) {
  try {
    const businessId = store.user.businessId;
    const warehouse = await warehousesService.getWarehouseById(
      params.id,
      businessId,
    );

    return successResponse(WAR.GET_SUCCESS, warehouse);
  } catch (err) {
    logger.error({ err }, "Get warehouse failed");
    set.status =
      err.statusCode || (err.message === "Warehouse not found" ? 404 : 500);
    const code = set.status === 404 ? WAR.NOT_FOUND : WAR.LIST_FAILED;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(code, message);
  }
}

export async function createWarehouseController({ body, store, set }) {
  try {
    const userId = store.user.id;
    const businessId = store.user.businessId;
    const warehouse = await warehousesService.createWarehouse(
      body,
      userId,
      businessId,
    );

    set.status = 201;
    return successResponse(WAR.CREATE_SUCCESS, warehouse);
  } catch (err) {
    logger.error({ err }, "Create warehouse failed");
    set.status = err.statusCode || 400;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(WAR.CREATE_FAILED, message);
  }
}

export async function updateWarehouseController({ params, body, store, set }) {
  try {
    const userId = store.user.id;
    const businessId = store.user.businessId;
    const warehouse = await warehousesService.updateWarehouse(
      params.id,
      body,
      userId,
      businessId,
    );

    return successResponse(WAR.UPDATE_SUCCESS, warehouse);
  } catch (err) {
    logger.error({ err }, "Update warehouse failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(WAR.UPDATE_FAILED, message);
  }
}

export async function deleteWarehouseController({ params, store, set }) {
  try {
    const businessId = store.user.businessId;
    const result = await warehousesService.deleteWarehouse(
      params.id,
      businessId,
    );

    return successResponse(WAR.DELETE_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Delete warehouse failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(WAR.DELETE_FAILED, message);
  }
}

export async function getWarehouseInventoryController({
  params,
  query,
  store,
  set,
}) {
  try {
    const businessId = store.user.businessId;
    const result = await warehousesService.getWarehouseInventory(
      params.id,
      query,
      businessId,
    );

    return successResponse(WAR.GET_INVENTORY_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Get warehouse inventory failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(WAR.GET_INVENTORY_FAILED, message);
  }
}
