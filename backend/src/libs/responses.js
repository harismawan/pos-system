/**
 * Response helper functions
 * Provides consistent response formatting with codes
 */

/**
 * Create a success response
 * @param {string} code - Response code (e.g., 'AUT-200-001')
 * @param {any} data - Response data
 * @returns {Object} Formatted success response
 */
export function successResponse(code, data) {
  return {
    success: true,
    code,
    data,
  };
}

/**
 * Create an error response
 * @param {string} code - Response code (e.g., 'AUT-401-001')
 * @param {string} error - Error message
 * @param {any} [details] - Optional error details
 * @returns {Object} Formatted error response
 */
export function errorResponse(code, error, details = null) {
  const response = {
    success: false,
    code,
    error,
  };
  if (details) {
    response.details = details;
  }
  return response;
}
