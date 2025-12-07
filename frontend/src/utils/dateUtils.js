/**
 * Format a date string or Date object to a localized string with Asia/Jakarta timezone.
 * @param {string|Date} date - The date to format
 * @param {Object} options - Optional Intl.DateTimeFormat options to override defaults
 * @returns {string} Formatted date string
 */
export const formatDateTime = (date, options = {}) => {
    if (!date) return '-';

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
        hour12: false
    };

    return new Date(date).toLocaleString('id-ID', { ...defaultOptions, ...options });
};

/**
 * Format a date string to just the date (no time) with Asia/Jakarta timezone.
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDateOnly = (date) => {
    return formatDateTime(date, {
        hour: undefined,
        minute: undefined,
        second: undefined
    });
};

/**
 * Format a date string to just the time (no date) with Asia/Jakarta timezone.
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted time string
 */
export const formatTimeOnly = (date) => {
    return formatDateTime(date, {
        year: undefined,
        month: undefined,
        day: undefined,
        hour: '2-digit',
        minute: '2-digit'
    });
};
