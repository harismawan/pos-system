/**
 * Elysia application setup
 * Middleware, error handling, and routing
 */

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import config from './config/index.js';
import { globalErrorHandler } from './libs/errorHandler.js';
import redis from './libs/redis.js';
import prisma from './libs/prisma.js';

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
app.onError(globalErrorHandler);

// Health check
app.get('/health', async () => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        services: {
            redis: 'unknown',
            database: 'unknown',
        },
    };

    // Check Redis
    try {
        await redis.ping();
        health.services.redis = 'healthy';
    } catch (err) {
        health.services.redis = 'unhealthy';
        health.status = 'degraded';
    }

    // Check Database
    try {
        await prisma.$queryRaw`SELECT 1`;
        health.services.database = 'healthy';
    } catch (err) {
        health.services.database = 'unhealthy';
        health.status = 'degraded';
    }

    return health;
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
