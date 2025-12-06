/**
 * Elysia application setup
 * Middleware, error handling, and routing
 */

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { randomUUID } from 'crypto';
import logger from './libs/logger.js';
import config from './config/index.js';

// Import routes
import { authRoutes } from './modules/auth/auth.routes.js';
import { productsRoutes } from './modules/products/products.routes.js';
import { pricingRoutes } from './modules/pricing/pricing.routes.js';
import { salesRoutes } from './modules/sales/sales.routes.js';
import { customersRoutes } from './modules/customers/customers.routes.js';
import { outletsRoutes } from './modules/outlets/outlets.routes.js';
import { warehousesRoutes } from './modules/warehouses/warehouses.routes.js';
import { inventoryRoutes } from './modules/inventory/inventory.routes.js';
import { suppliersRoutes } from './modules/suppliers/suppliers.routes.js';
import { purchaseOrdersRoutes } from './modules/purchaseOrders/purchaseOrders.routes.js';

const app = new Elysia();

// CORS middleware
app.use(cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Outlet-Id'],
}));

// Global error handler
app.onError(({ code, error, set, request }) => {
    logger.error({
        err: error,
        code,
        requestId: request.id,
        path: request.url,
        method: request.method,
    }, 'Request error');

    if (code === 'VALIDATION') {
        set.status = 400;
        return {
            success: false,
            error: 'Validation failed',
            details: error.message,
        };
    }

    if (code === 'NOT_FOUND') {
        set.status = 404;
        return {
            success: false,
            error: 'Route not found',
        };
    }

    set.status = 500;
    return {
        success: false,
        error: config.nodeEnv === 'production' ?
            'Internal server error' :
            error.message,
    };
});

// Health check
app.get('/health', () => {
    return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
    };
});

// API routes
app.group('/api', (app) =>
    app
        .use(authRoutes)
        .use(productsRoutes)
        .use(pricingRoutes)
        .use(salesRoutes)
        .use(customersRoutes)
        .use(outletsRoutes)
        .use(warehousesRoutes)
        .use(inventoryRoutes)
        .use(suppliersRoutes)
        .use(purchaseOrdersRoutes)
);

export default app;
