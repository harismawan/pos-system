/**
 * Products controller
 */

import * as productsService from "./products.service.js";
import logger from "../../libs/logger.js";
import { PRD } from "../../libs/responseCodes.js";
import { successResponse, errorResponse } from "../../libs/responses.js";

export async function getProductsController({ query, store, set }) {
  try {
    const outletId = store.outletId || query.outletId;
    const result = await productsService.getProducts({ ...query, outletId });

    return successResponse(PRD.LIST_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Get products failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(PRD.LIST_FAILED, message);
  }
}

export async function getProductByIdController({ params, set }) {
  try {
    const product = await productsService.getProductById(params.id);

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

export async function createProductController({ body, set }) {
  try {
    const product = await productsService.createProduct(body);

    set.status = 201;
    return successResponse(PRD.CREATE_SUCCESS, product);
  } catch (err) {
    logger.error({ err }, "Create product failed");
    set.status = err.statusCode || 400;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(PRD.CREATE_FAILED, message);
  }
}

export async function updateProductController({ params, body, set }) {
  try {
    const product = await productsService.updateProduct(params.id, body);

    return successResponse(PRD.UPDATE_SUCCESS, product);
  } catch (err) {
    logger.error({ err }, "Update product failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(PRD.UPDATE_FAILED, message);
  }
}

export async function deleteProductController({ params, set }) {
  try {
    const result = await productsService.deleteProduct(params.id);

    return successResponse(PRD.DELETE_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Delete product failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(PRD.DELETE_FAILED, message);
  }
}
