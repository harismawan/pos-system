/**
 * Customers controller
 */

import * as customersService from "./customers.service.js";
import logger from "../../libs/logger.js";
import { CUS } from "../../libs/responseCodes.js";
import { successResponse, errorResponse } from "../../libs/responses.js";

export async function getCustomersController({ query, set }) {
  try {
    const result = await customersService.getCustomers(query);

    return successResponse(CUS.LIST_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Get customers failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(CUS.LIST_FAILED, message);
  }
}

export async function getCustomerByIdController({ params, set }) {
  try {
    const customer = await customersService.getCustomerById(params.id);

    return successResponse(CUS.GET_SUCCESS, customer);
  } catch (err) {
    logger.error({ err }, "Get customer failed");
    set.status =
      err.statusCode || (err.message === "Customer not found" ? 404 : 500);
    const code = set.status === 404 ? CUS.NOT_FOUND : CUS.LIST_FAILED;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(code, message);
  }
}

export async function createCustomerController({ body, set }) {
  try {
    const customer = await customersService.createCustomer(body);

    set.status = 201;
    return successResponse(CUS.CREATE_SUCCESS, customer);
  } catch (err) {
    logger.error({ err }, "Create customer failed");
    set.status = err.statusCode || 400;
    const message = err.statusCode
      ? err.message
      : set.status === 500
        ? "Internal Server Error"
        : err.message;
    // Note: Defaulting to 400 for create/update failures if not 500, but service might throw generic error.
    // If service throws generic error without statusCode, assuming it's validation/constraint unless it's system error.
    // Strict safe: set.status = err.statusCode || 500;
    // But previously it was hardcoded 400.
    // Let's stick to safe pattern:
    // If no statusCode, and we treated it as 400 before, we risk leaking info if we don't treat it as 500.
    // However, unique constraint errors usually have no statusCode but are client errors?
    // Prisma P2002 is client error.
    // Let's force statusCode || 500 generally.
    // But for existing code that hardcoded 400, I should probably keep it 400 IF I'm sure it's validation? No, explicit better.
    // I will use err.statusCode || 500.
    set.status = err.statusCode || 500;
    const safeMessage =
      set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(CUS.CREATE_FAILED, safeMessage);
  }
}

export async function updateCustomerController({ params, body, set }) {
  try {
    const customer = await customersService.updateCustomer(params.id, body);

    return successResponse(CUS.UPDATE_SUCCESS, customer);
  } catch (err) {
    logger.error({ err }, "Update customer failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(CUS.UPDATE_FAILED, message);
  }
}

export async function deleteCustomerController({ params, set }) {
  try {
    const result = await customersService.deleteCustomer(params.id);

    return successResponse(CUS.DELETE_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Delete customer failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(CUS.DELETE_FAILED, message);
  }
}
