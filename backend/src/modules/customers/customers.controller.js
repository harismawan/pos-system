/**
 * Customers controller
 */

import * as customersService from './customers.service.js';
import logger from '../../libs/logger.js';
import { CUS } from '../../libs/responseCodes.js';
import { successResponse, errorResponse } from '../../libs/responses.js';

export async function getCustomersController({ query, set }) {
    try {
        const result = await customersService.getCustomers(query);

        return successResponse(CUS.LIST_SUCCESS, result);
    } catch (err) {
        logger.debug({ err }, 'Get customers failed');
        set.status = 500;
        return errorResponse(CUS.LIST_FAILED, err.message || 'Failed to retrieve customers');
    }
}

export async function getCustomerByIdController({ params, set }) {
    try {
        const customer = await customersService.getCustomerById(params.id);

        return successResponse(CUS.GET_SUCCESS, customer);
    } catch (err) {
        logger.debug({ err }, 'Get customer failed');
        set.status = err.message === 'Customer not found' ? 404 : 500;
        const code = err.message === 'Customer not found' ? CUS.NOT_FOUND : CUS.LIST_FAILED;
        return errorResponse(code, err.message || 'Failed to retrieve customer');
    }
}

export async function createCustomerController({ body, set }) {
    try {
        const customer = await customersService.createCustomer(body);

        set.status = 201;
        return successResponse(CUS.CREATE_SUCCESS, customer);
    } catch (err) {
        logger.debug({ err }, 'Create customer failed');
        set.status = 400;
        return errorResponse(CUS.CREATE_FAILED, err.message || 'Failed to create customer');
    }
}

export async function updateCustomerController({ params, body, set }) {
    try {
        const customer = await customersService.updateCustomer(params.id, body);

        return successResponse(CUS.UPDATE_SUCCESS, customer);
    } catch (err) {
        logger.debug({ err }, 'Update customer failed');
        set.status = 400;
        return errorResponse(CUS.UPDATE_FAILED, err.message || 'Failed to update customer');
    }
}

export async function deleteCustomerController({ params, set }) {
    try {
        const result = await customersService.deleteCustomer(params.id);

        return successResponse(CUS.DELETE_SUCCESS, result);
    } catch (err) {
        logger.debug({ err }, 'Delete customer failed');
        set.status = 400;
        return errorResponse(CUS.DELETE_FAILED, err.message || 'Failed to delete customer');
    }
}
