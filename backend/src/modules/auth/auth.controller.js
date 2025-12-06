/**
 * Auth controller
 * Handles HTTP requests for authentication
 */

import * as authService from './auth.service.js';
import logger from '../../libs/logger.js';

export async function loginController({ body, set }) {
    try {
        const { username, password } = body;

        const result = await authService.login(username, password);

        return {
            success: true,
            data: result,
        };
    } catch (err) {
        logger.error({ err }, 'Login failed');
        set.status = 401;
        return {
            success: false,
            error: err.message || 'Authentication failed',
        };
    }
}

export async function refreshController({ body, set }) {
    try {
        const { refreshToken } = body;

        if (!refreshToken) {
            set.status = 400;
            return {
                success: false,
                error: 'Refresh token required',
            };
        }

        const result = await authService.refresh(refreshToken);

        return {
            success: true,
            data: result,
        };
    } catch (err) {
        logger.error({ err }, 'Token refresh failed');
        set.status = 401;
        return {
            success: false,
            error: err.message || 'Invalid refresh token',
        };
    }
}

export async function getMeController({ store, set }) {
    try {
        // Assuming store.user is populated by a preceding middleware
        if (!store.user) {
            set.status = 401;
            return {
                success: false,
                error: 'User not authenticated or user data not found',
            };
        }
        return {
            success: true,
            data: {
                user: store.user,
            },
        };
    } catch (err) {
        logger.error({ err }, 'Get user info failed');
        set.status = 500;
        return {
            success: false,
            error: err.message || 'Failed to get user info',
        };
    }
}

export async function logoutController({ store }) {
    // For stateless JWT, logout is handled client-side by removing tokens
    // Optionally, implement token blacklisting in Redis if needed

    logger.info({ userId: store.user?.id }, 'User logged out');

    return {
        success: true,
        message: 'Logged out successfully',
    };
}
