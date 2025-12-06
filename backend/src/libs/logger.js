/**
 * Pino logger configuration
 * Provides structured JSON logging with request IDs
 */

import pino from 'pino';
import config from '../config/index.js';

const logger = pino({
    level: config.logging?.level || (config.nodeEnv === 'production' ? 'info' : 'debug'),
    redact: {
        paths: config.nodeEnv === 'production' ? config.logging?.redactPaths || [] : [],
        censor: '[REDACTED]',
    },
    transport:
        config.nodeEnv !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                    singleLine: true,
                    colorize: true,
                    translateTime: 'yyyy-mm-dd HH:MM:ss.l o',
                    ignore: 'pid,hostname',
                },
            }
            : {
                target: 'pino/file',
                options: {
                    destination: 1, // stdout
                },
                sync: false,
            },
    formatters: {
        level: (label) => {
            return { level: label };
        },
    },
    serializers: {
        req: (req) => ({
            id: req.id,
            method: req.method,
            url: req.url,
            headers: {
                host: req.headers?.host,
                'user-agent': req.headers?.['user-agent'],
            },
        }),
        res: (res) => ({
            statusCode: res.statusCode,
        }),
        err: pino.stdSerializers.err,
    },
});

/**
 * Create a child logger with additional context
 * @param {Object} bindings - Additional fields to bind to logger
 * @returns {Object} Child logger instance
 */
export function createLogger(bindings) {
    return logger.child(bindings);
}

export default logger;
