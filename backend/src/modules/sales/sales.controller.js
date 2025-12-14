/**
 * Sales controller
 */

import * as salesService from "./sales.service.js";
import logger from "../../libs/logger.js";
import { SAL } from "../../libs/responseCodes.js";
import { successResponse, errorResponse } from "../../libs/responses.js";
import { enqueueAuditLogJob, createAuditLogData } from "../../libs/jobs.js";

export async function createPosOrderController({ body, store, set }) {
  try {
    const userId = store.user.id;
    const businessId = store.user.businessId;
    const order = await salesService.createPosOrder(body, userId, businessId);

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "SALE_CREATED",
        outletId: order.outletId,
        entityType: "PosOrder",
        entityId: order.id,
        payload: {
          orderNumber: order.orderNumber,
          totalAmount: parseFloat(order.totalAmount),
          itemCount: order.items.length,
        },
      }),
    );

    set.status = 201;
    return successResponse(SAL.CREATE_ORDER_SUCCESS, order);
  } catch (err) {
    logger.error({ err }, "Create POS order failed");
    set.status = err.statusCode || 400;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(SAL.CREATE_FAILED, message);
  }
}

export async function getPosOrdersController({ query, store, set }) {
  try {
    const businessId = store.user.businessId;
    const outletId = store.outletId || query.outletId;
    const result = await salesService.getPosOrders(
      { ...query, outletId },
      businessId,
    );

    return successResponse(SAL.LIST_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Get POS orders failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(SAL.LIST_FAILED, message);
  }
}

export async function getPosOrderByIdController({ params, store, set }) {
  try {
    const businessId = store.user.businessId;
    const order = await salesService.getPosOrderById(params.id, businessId);

    return successResponse(SAL.GET_SUCCESS, order);
  } catch (err) {
    logger.error({ err }, "Get POS order failed");
    set.status = err.message === "Order not found" ? 404 : 500;
    const code =
      err.message === "Order not found" ? SAL.NOT_FOUND : SAL.LIST_FAILED;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(code, message);
  }
}

export async function completePosOrderController({ params, store, set }) {
  try {
    const userId = store.user.id;
    const businessId = store.user.businessId;
    const order = await salesService.completePosOrder(
      params.id,
      userId,
      businessId,
    );

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "SALE_COMPLETED",
        outletId: order.outletId,
        entityType: "PosOrder",
        entityId: order.id,
        payload: {
          orderNumber: order.orderNumber,
          totalAmount: parseFloat(order.totalAmount),
          itemCount: order.items.length,
        },
      }),
    );

    return successResponse(SAL.COMPLETE_SUCCESS, order);
  } catch (err) {
    logger.error({ err }, "Complete POS order failed");
    set.status = 400;
    return errorResponse(
      SAL.COMPLETE_FAILED,
      err.message || "Failed to complete order",
    );
  }
}

export async function cancelPosOrderController({ params, store, set }) {
  try {
    const userId = store.user.id;
    const businessId = store.user.businessId;
    const order = await salesService.cancelPosOrder(
      params.id,
      userId,
      businessId,
    );

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "SALE_CANCELLED",
        outletId: order.outletId,
        entityType: "PosOrder",
        entityId: order.id,
        payload: {
          orderNumber: order.orderNumber,
          reason: "Cancelled by user",
        },
      }),
    );

    return successResponse(SAL.CANCEL_SUCCESS, order);
  } catch (err) {
    logger.error({ err }, "Cancel POS order failed");
    set.status = 400;
    return errorResponse(
      SAL.CANCEL_FAILED,
      err.message || "Failed to cancel order",
    );
  }
}

export async function addPaymentController({ params, body, store, set }) {
  try {
    const businessId = store.user.businessId;
    const result = await salesService.addPayment(params.id, body, businessId);

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "PAYMENT_ADDED",
        outletId: result.outletId,
        entityType: "PosOrder",
        entityId: result.id,
        payload: {
          amount: body.amount,
          method: body.paymentMethod,
          orderNumber: result.orderNumber,
        },
      }),
    );

    set.status = 201;
    return successResponse(SAL.ADD_PAYMENT_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Add payment failed");
    set.status = 400;
    return errorResponse(
      SAL.PAYMENT_FAILED,
      err.message || "Failed to add payment",
    );
  }
}
