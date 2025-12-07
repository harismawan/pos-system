/**
 * Pagination utilities with enforced limits
 * Prevents memory issues from large queries
 */

// Default pagination settings
export const PAGINATION_DEFAULTS = {
    page: 1,
    limit: 10,
    maxLimit: 100,  // Maximum items per page
};

/**
 * Normalize and validate pagination parameters
 * @param {Object} params - Raw pagination params from query
 * @param {Object} options - Custom defaults
 * @returns {{ page: number, limit: number, skip: number }}
 */
export function normalizePagination(params = {}, options = {}) {
    const defaults = { ...PAGINATION_DEFAULTS, ...options };

    // Parse page number
    let page = parseInt(params.page, 10);
    if (isNaN(page) || page < 1) {
        page = defaults.page;
    }

    // Parse and cap limit
    let limit = parseInt(params.limit, 10);
    if (isNaN(limit) || limit < 1) {
        limit = defaults.limit;
    }
    // Enforce max limit
    if (limit > defaults.maxLimit) {
        limit = defaults.maxLimit;
    }

    // Calculate skip for Prisma
    const skip = (page - 1) * limit;

    return { page, limit, skip };
}

/**
 * Build pagination response metadata
 * @param {number} total - Total count of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Pagination metadata
 */
export function buildPaginationMeta(total, page, limit) {
    return {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
    };
}
