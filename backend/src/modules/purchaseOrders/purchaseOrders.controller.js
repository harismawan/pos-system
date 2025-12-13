/**
 * Purchase Orders controller
 */

import * as purchaseOrdersService from "./purchaseOrders.service.js";
import logger from "../../libs/logger.js";
import { POR } from "../../libs/responseCodes.js";
import { successResponse, errorResponse } from "../../libs/responses.js";

export async function getPurchaseOrdersController({ query, store, set }) {
  try {
    const businessId = store.user.businessId;
    const outletId = store.outletId || query.outletId;
    const result = await purchaseOrdersService.getPurchaseOrders(
      {
        ...query,
        outletId,
      },
      businessId,
    );

    return successResponse(POR.LIST_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Get purchase orders failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(POR.LIST_FAILED, message);
  }
}

export async function getPurchaseOrderByIdController({ params, store, set }) {
  try {
    const businessId = store.user.businessId;
    const order = await purchaseOrdersService.getPurchaseOrderById(
      params.id,
      businessId,
    );

    return successResponse(POR.GET_SUCCESS, order);
  } catch (err) {
    logger.error({ err }, "Get purchase order failed");
    set.status =
      err.statusCode ||
      (err.message === "Purchase order not found" ? 404 : 500);
    const code = set.status === 404 ? POR.NOT_FOUND : POR.LIST_FAILED;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(code, message);
  }
}

export async function createPurchaseOrderController({ body, store, set }) {
  try {
    const userId = store.user.id;
    const businessId = store.user.businessId;
    const order = await purchaseOrdersService.createPurchaseOrder(
      body,
      userId,
      businessId,
    );

    set.status = 201;
    return successResponse(POR.CREATE_SUCCESS, order);
  } catch (err) {
    logger.error({ err }, "Create purchase order failed");
    set.status = err.statusCode || 400;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(POR.CREATE_FAILED, message);
  }
}

export async function updatePurchaseOrderController({
  params,
  body,
  store,
  set,
}) {
  try {
    const userId = store.user.id;
    const businessId = store.user.businessId;
    const order = await purchaseOrdersService.updatePurchaseOrder(
      params.id,
      body,
      userId,
      businessId,
    );

    return successResponse(POR.UPDATE_SUCCESS, order);
  } catch (err) {
    logger.error({ err }, "Update purchase order failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(POR.UPDATE_FAILED, message);
  }
}

export async function receivePurchaseOrderController({
  params,
  body,
  store,
  set,
}) {
  try {
    const userId = store.user.id;
    const businessId = store.user.businessId;
    const order = await purchaseOrdersService.receivePurchaseOrder(
      params.id,
      body.receivedItems,
      userId,
      businessId,
    );

    return successResponse(POR.RECEIVE_SUCCESS, order);
  } catch (err) {
    logger.error({ err }, "Receive purchase order failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(POR.RECEIVE_FAILED, message);
  }
}

export async function cancelPurchaseOrderController({ params, store, set }) {
  try {
    const userId = store.user.id;
    const businessId = store.user.businessId;
    const order = await purchaseOrdersService.cancelPurchaseOrder(
      params.id,
      userId,
      businessId,
    );

    return successResponse(POR.CANCEL_SUCCESS, order);
  } catch (err) {
    logger.error({ err }, "Cancel purchase order failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(POR.CANCEL_FAILED, message);
  }
}
