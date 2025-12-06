/**
 * Server entry point
 */

import app from './app.js';
import config from './config/index.js';
import logger from './libs/logger.js';
import prisma from './libs/prisma.js';
import redis from './libs/redis.js';

// Test database connection
try {
    await prisma.$connect();
    logger.info('Database connected');
} catch (err) {
    logger.error({ err }, 'Failed to connect to database');
    process.exit(1);
}

// Test Redis connection
try {
    await redis.ping();
    logger.info('Redis connected');
} catch (err) {
    logger.error({ err }, 'Failed to connect to Redis');
}

// Start server
app.listen(config.port, () => {
    logger.info(`🚀 Server running on http://localhost:${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
});
