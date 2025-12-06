/**
 * Global error handler for Elysia application
 * Centralizes error handling logic for better modularity
 */

import logger from './logger.js';
import config from '../config/index.js';
import { GEN } from './responseCodes.js';
import { errorResponse } from './responses.js';

/**
 * Global error handler function
 * @param {Object} context - Elysia error context
 * @param {string} context.code - Error code
 * @param {Error} context.error - Error object
 * @param {Object} context.set - Response setter
 * @param {Request} context.request - Request object
 * @returns {Object} Error response
 */
export const globalErrorHandler = ({ code, error, set, request }) => {
    logger.debug({
        err: error,
        code,
        requestId: request.id,
        path: request.url,
        method: request.method,
    }, 'Request error');

    // Handle validation errors
    if (code === 'VALIDATION') {
        set.status = 400;
        return errorResponse(GEN.VALIDATION_FAILED, 'Validation failed', error.message);
    }

    // Handle not found errors
    if (code === 'NOT_FOUND') {
        set.status = 404;
        return errorResponse(GEN.ROUTE_NOT_FOUND, 'Route not found');
    }

    // Log error for non-validation errors
    logger.error({
        err: error,
        code,
        requestId: request.id,
        path: request.url,
        method: request.method,
    }, 'Request error');

    // Handle all other errors
    set.status = 500;
    return errorResponse(
        GEN.INTERNAL_ERROR,
        config.nodeEnv === 'production' ? 'Internal server error' : error.message
    );
};
