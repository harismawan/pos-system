/**
 * Suppliers controller
 */

import * as suppliersService from "./suppliers.service.js";
import logger from "../../libs/logger.js";
import { SUP } from "../../libs/responseCodes.js";
import { successResponse, errorResponse } from "../../libs/responses.js";

export async function getSuppliersController({ query, set }) {
  try {
    const result = await suppliersService.getSuppliers(query);

    return successResponse(SUP.LIST_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Get suppliers failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(SUP.LIST_FAILED, message);
  }
}

export async function getSupplierByIdController({ params, set }) {
  try {
    const supplier = await suppliersService.getSupplierById(params.id);

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

export async function createSupplierController({ body, set }) {
  try {
    const supplier = await suppliersService.createSupplier(body);

    set.status = 201;
    return successResponse(SUP.CREATE_SUCCESS, supplier);
  } catch (err) {
    logger.error({ err }, "Create supplier failed");
    set.status = err.statusCode || 400;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(SUP.CREATE_FAILED, message);
  }
}

export async function updateSupplierController({ params, body, set }) {
  try {
    const supplier = await suppliersService.updateSupplier(params.id, body);

    return successResponse(SUP.UPDATE_SUCCESS, supplier);
  } catch (err) {
    logger.error({ err }, "Update supplier failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(SUP.UPDATE_FAILED, message);
  }
}

export async function deleteSupplierController({ params, set }) {
  try {
    const result = await suppliersService.deleteSupplier(params.id);

    return successResponse(SUP.DELETE_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Delete supplier failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(SUP.DELETE_FAILED, message);
  }
}
