/**
 * Inventory controller
 */

import * as inventoryService from "./inventory.service.js";
import logger from "../../libs/logger.js";
import { INV } from "../../libs/responseCodes.js";
import { successResponse, errorResponse } from "../../libs/responses.js";
import { enqueueAuditLogJob, createAuditLogData } from "../../libs/jobs.js";

export async function getInventoryController({ query, store, set }) {
  try {
    const businessId = store.user.businessId;
    const outletId = store.outletId || query.outletId;

    // Parse lowStock from string to boolean if provided
    const filters = { ...query, outletId };
    if (filters.lowStock !== undefined) {
      filters.lowStock =
        filters.lowStock === "true" || filters.lowStock === true;
    }

    const result = await inventoryService.getInventory(filters, businessId);

    return successResponse(INV.GET_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Get inventory failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(INV.GET_FAILED, message);
  }
}

export async function adjustInventoryController({ body, store, set }) {
  try {
    const userId = store.user.id;
    const businessId = store.user.businessId;
    const outletId = store.outletId || body.outletId;

    const result = await inventoryService.adjustInventory(
      { ...body, outletId },
      userId,
      businessId,
    );

    // Calculate signed quantity for consistency with previous implementation
    const adjustmentQuantity =
      body.type === "ADJUSTMENT_IN"
        ? Math.abs(body.quantity)
        : -Math.abs(body.quantity);

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "INVENTORY_ADJUSTED",
        outletId: outletId,
        entityType: "Inventory",
        entityId: result.id,
        payload: {
          productId: body.productId,
          warehouseId: body.warehouseId,
          type: body.type,
          quantity: adjustmentQuantity,
        },
      }),
    );

    return successResponse(INV.ADJUST_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Adjust inventory failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(INV.ADJUST_FAILED, message);
  }
}

export async function transferInventoryController({ body, store, set }) {
  try {
    const userId = store.user.id;
    const businessId = store.user.businessId;
    const outletId = store.outletId || body.outletId;

    const result = await inventoryService.transferInventory(
      { ...body, outletId },
      userId,
      businessId,
    );

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "INVENTORY_TRANSFERRED",
        outletId: outletId,
        entityType: "StockMovement",
        entityId: `${body.productId}-${body.fromWarehouseId}-${body.toWarehouseId}`,
        payload: {
          productId: body.productId,
          fromWarehouseId: body.fromWarehouseId,
          toWarehouseId: body.toWarehouseId,
          quantity: parseFloat(body.quantity),
        },
      }),
    );

    return successResponse(INV.TRANSFER_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Transfer inventory failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(INV.TRANSFER_FAILED, message);
  }
}

export async function getStockMovementsController({ query, store, set }) {
  try {
    const businessId = store.user.businessId;
    const outletId = store.outletId || query.outletId;
    const result = await inventoryService.getStockMovements(
      {
        ...query,
        outletId,
      },
      businessId,
    );

    return successResponse(INV.MOVEMENTS_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Get stock movements failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(INV.MOVEMENTS_FAILED, message);
  }
}
