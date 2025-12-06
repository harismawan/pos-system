/**
 * Prisma Client instance
 * Singleton pattern for database connections
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import logger from './logger.js';
import config from '../config/index.js';

// Create PostgreSQL connection pool
const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    max: config.database.poolMax,
    min: config.database.poolMin,
    idleTimeoutMillis: config.database.idleTimeoutMillis,
    connectionTimeoutMillis: config.database.connectionTimeoutMillis,
    allowExitOnIdle: false,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Prisma 7: Initialize with adapter
const prisma = new PrismaClient({
    adapter,
    log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
    ],
});

// Log queries in development
if (process.env.NODE_ENV === 'development') {
    prisma.$on('query', (e) => {
        logger.debug({ query: e.query, params: e.params, duration: e.duration }, 'Prisma Query');
    });
}

// Log errors
prisma.$on('error', (e) => {
    logger.error({ target: e.target, message: e.message }, 'Prisma Error');
});

// Log warnings
prisma.$on('warn', (e) => {
    logger.warn({ target: e.target, message: e.message }, 'Prisma Warning');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Disconnecting Prisma...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Disconnecting Prisma...');
    await prisma.$disconnect();
    process.exit(0);
});

export default prisma;
