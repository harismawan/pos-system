/**
 * Request logging middleware for Elysia
 */

import logger from './logger.js';
import config from '../config/index.js';
import { randomUUID } from 'crypto';

/**
 * Get all headers as an object
 * @param {Headers} headers - Request/response headers object
 * @returns {Object} Headers object
 */
function getAllHeaders(headers) {
    const headerObj = {};
    headers.forEach((value, key) => {
        headerObj[key] = value;
    });
    return headerObj;
}

/**
 * Format request body for logging
 * @param {any} body - Parsed body from Elysia context
 * @param {string} contentType - Content type header
 * @returns {any} Formatted body for logging
 */
function formatRequestBodyForLogging(body, contentType) {
    if (!body) {
        return undefined;
    }

    // Check content type for special handling
    if (contentType && contentType.includes('multipart/form-data')) {
        return '[FORM DATA]';
    }

    // For JSON and other parsed bodies, return as-is
    if (typeof body === 'object') {
        return body;
    }

    // For text or other types
    return body;
}

/**
 * Request logger middleware using Elysia plugin pattern
 * Logs a single combined entry with request and response details
 * Usage: app.use(withRequestLogger())
 */
export const withRequestLogger = () => (app) => {
    // Initialize request metadata
    app.onBeforeHandle(({ request, store }) => {
        // Use client-provided X-Request-ID or generate new one
        const clientRequestId = request.headers.get('x-request-id');
        store.requestId = clientRequestId || randomUUID();
        store.requestStartTime = Date.now();
    });

    // Log combined request/response
    app.onAfterHandle(({ request, body, response, set, store }) => {
        const requestId = store.requestId;
        const duration = Date.now() - (store.requestStartTime || Date.now());

        // Add X-Request-ID to response headers for correlation
        if (!set.headers) set.headers = {};
        set.headers['x-request-id'] = requestId;

        // Build combined log data
        const logData = {
            requestId,
            method: request.method,
            url: request.url,
            statusCode: set.status || 200,
            duration: `${duration}ms`,
        };

        // Add request headers based on config
        if (config.logging.logFullHeaders) {
            logData.requestHeaders = getAllHeaders(request.headers);
        } else {
            // Log only specific headers
            logData.headers = {
                'x-outlet-id': request.headers.get('x-outlet-id'),
                'x-request-id': requestId,
            };
        }

        // Add request body if enabled (use parsed body from Elysia context)
        if (config.logging.logRequestBody && request.method !== 'GET' && request.method !== 'HEAD') {
            const contentType = request.headers.get('content-type') || '';
            logData.requestBody = formatRequestBodyForLogging(body, contentType);
        }

        // Add response body if enabled
        if (config.logging.logResponseBody) {
            if (response && typeof response === 'object') {
                logData.responseBody = response;
            } else if (response) {
                logData.responseBody = String(response);
            }
        }

        // Add response headers if full headers logging is enabled
        if (config.logging.logFullHeaders && set.headers) {
            logData.responseHeaders = set.headers;
        }

        // Log asynchronously with appropriate level
        setImmediate(() => {
            const logLevel = set.status >= 500 ? 'error' : set.status >= 400 ? 'warn' : 'info';
            logger[logLevel](logData, 'HTTP Request');
        });

        // Return response unchanged
        return response;
    });

    return app;
};

// Legacy export for backwards compatibility (deprecated)
export async function requestLogger({ request, set, store }) {
    const requestId = randomUUID();
    store.requestId = requestId;

    setImmediate(() => {
        logger.info({
            requestId,
            method: request.method,
            url: request.url,
            headers: {
                'x-outlet-id': request.headers.get('x-outlet-id'),
            },
        }, 'Incoming request');
    });
}
