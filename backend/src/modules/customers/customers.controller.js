/**
 * Customers controller
 */

import * as customersService from './customers.service.js';
import logger from '../../libs/logger.js';

export async function getCustomersController({ query, set }) {
    try {
        const result = await customersService.getCustomers(query);

        return {
            success: true,
            data: result,
        };
    } catch (err) {
        logger.error({ err }, 'Get customers failed');
        set.status = 500;
        return {
            success: false,
            error: err.message || 'Failed to retrieve customers',
        };
    }
}

export async function getCustomerByIdController({ params, set }) {
    try {
        const customer = await customersService.getCustomerById(params.id);

        return {
            success: true,
            data: customer,
        };
    } catch (err) {
        logger.error({ err }, 'Get customer failed');
        set.status = err.message === 'Customer not found' ? 404 : 500;
        return {
            success: false,
            error: err.message || 'Failed to retrieve customer',
        };
    }
}

export async function createCustomerController({ body, set }) {
    try {
        const customer = await customersService.createCustomer(body);

        set.status = 201;
        return {
            success: true,
            data: customer,
        };
    } catch (err) {
        logger.error({ err }, 'Create customer failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to create customer',
        };
    }
}

export async function updateCustomerController({ params, body, set }) {
    try {
        const customer = await customersService.updateCustomer(params.id, body);

        return {
            success: true,
            data: customer,
        };
    } catch (err) {
        logger.error({ err }, 'Update customer failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to update customer',
        };
    }
}

export async function deleteCustomerController({ params, set }) {
    try {
        const result = await customersService.deleteCustomer(params.id);

        return {
            success: true,
            data: result,
        };
    } catch (err) {
        logger.error({ err }, 'Delete customer failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to delete customer',
        };
    }
}
