/**
 * Products controller
 */

import * as productsService from "./products.service.js";
import logger from "../../libs/logger.js";
import { PRD } from "../../libs/responseCodes.js";
import { successResponse, errorResponse } from "../../libs/responses.js";
import { enqueueAuditLogJob, createAuditLogData } from "../../libs/jobs.js";

export async function getProductsController({ query, store, set }) {
  try {
    const businessId = store.user.businessId;
    const outletId = store.outletId || query.outletId;
    const result = await productsService.getProducts({
      ...query,
      outletId,
      businessId,
    });

    return successResponse(PRD.LIST_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Get products failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(PRD.LIST_FAILED, message);
  }
}

export async function getProductByIdController({ params, store, set }) {
  try {
    const businessId = store.user.businessId;
    const product = await productsService.getProductById(params.id, businessId);

    return successResponse(PRD.GET_SUCCESS, product);
  } catch (err) {
    logger.error({ err }, "Get product failed");
    set.status =
      err.statusCode || (err.message === "Product not found" ? 404 : 500);
    const code = set.status === 404 ? PRD.NOT_FOUND : PRD.LIST_FAILED;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(code, message);
  }
}

export async function createProductController({ body, store, set }) {
  try {
    const businessId = store.user.businessId;
    const product = await productsService.createProduct(body, businessId);

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "PRODUCT_CREATED",
        outletId: null,
        entityType: "Product",
        entityId: product.id,
        payload: {
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          price: product.price,
        },
      }),
    );

    set.status = 201;
    return successResponse(PRD.CREATE_SUCCESS, product);
  } catch (err) {
    logger.error({ err }, "Create product failed");
    set.status = err.statusCode || 400;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(PRD.CREATE_FAILED, message);
  }
}

export async function updateProductController({ params, body, store, set }) {
  try {
    const businessId = store.user.businessId;
    const product = await productsService.updateProduct(
      params.id,
      body,
      businessId,
    );

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "PRODUCT_UPDATED",
        outletId: null,
        entityType: "Product",
        entityId: params.id,
        payload: {
          changes: Object.keys(body),
        },
      }),
    );

    return successResponse(PRD.UPDATE_SUCCESS, product);
  } catch (err) {
    logger.error({ err }, "Update product failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(PRD.UPDATE_FAILED, message);
  }
}

export async function deleteProductController({ params, store, set }) {
  try {
    const businessId = store.user.businessId;
    const result = await productsService.deleteProduct(params.id, businessId);

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "PRODUCT_DELETED",
        outletId: null,
        entityType: "Product",
        entityId: params.id,
        payload: {},
      }),
    );

    return successResponse(PRD.DELETE_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Delete product failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(PRD.DELETE_FAILED, message);
  }
}
