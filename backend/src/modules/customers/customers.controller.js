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
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(CUS.CREATE_FAILED, message);
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
