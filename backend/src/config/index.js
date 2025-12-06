/**
 * Central configuration module
 * Loads and validates environment variables
 */

/**
 * Parse duration string to seconds
 * Supports formats: 15m, 1h, 7d, 30d, etc.
 * @param {string} duration - Duration string
 * @returns {number} Duration in seconds
 */
function parseDuration(duration) {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
        throw new Error(`Invalid duration format: ${duration}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers = {
        s: 1,
        m: 60,
        h: 3600,
        d: 86400,
    };

    return value * multipliers[unit];
}

const config = {
    // Server
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    // Database
    databaseUrl: process.env.DATABASE_URL,
    database: {
        poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
        poolMin: parseInt(process.env.DATABASE_POOL_MIN || '1', 10),
        idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000', 10),
        connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '10000', 10),
    },

    // CORS
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: process.env.CORS_CREDENTIALS === 'true',
    },

    // Redis
    redis: {
        url: process.env.REDIS_URL,
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },

    // JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'change-this-secret-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'change-this-refresh-secret-in-production',
        refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
        // TTL in seconds for Redis token storage
        accessTokenTTL: parseDuration(process.env.JWT_EXPIRES_IN || '15m'),
        refreshTokenTTL: parseDuration(process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'),
    },

    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        logRequestBody: process.env.LOG_REQUEST_BODY === 'true',
        logResponseBody: process.env.LOG_RESPONSE_BODY === 'true',
        logFullHeaders: process.env.LOG_FULL_HEADERS === 'true',
        redactPaths: process.env.LOG_REDACT_PATHS
            ? process.env.LOG_REDACT_PATHS.split(',').map(p => p.trim()).filter(Boolean)
            : [
                // Default header redaction paths
                'headers.authorization',
                'headers.cookie',
                'headers["x-api-key"]',
                'headers["x-auth-token"]',
                'headers["api-key"]',
                'headers["access-token"]',
                'requestHeaders.authorization',
                'requestHeaders.cookie',
                'requestHeaders["x-api-key"]',
                'requestHeaders["x-auth-token"]',
                'requestHeaders["api-key"]',
                'requestHeaders["access-token"]',
                'responseHeaders.authorization',
                'responseHeaders["set-cookie"]',
                // Default body redaction paths
                '*.password',
                '*.token',
                '*.secret',
                '*.apiKey',
                '*.accessToken',
                '*.refreshToken',
                'requestBody.password',
                'requestBody.token',
                'requestBody.secret',
                'responseBody.password',
                'responseBody.token',
                'responseBody.secret',
            ],
    },
};

// Validation
function validateConfig() {
    const required = [
        'databaseUrl',
    ];

    const missing = required.filter(key => {
        const keys = key.split('.');
        let value = config;
        for (const k of keys) {
            value = value[k];
            if (value === undefined) return true;
        }
        return !value;
    });

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

validateConfig();

export default config;
