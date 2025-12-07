/**
 * Response compression middleware for Elysia
 * Supports gzip and deflate compression
 */

import { gzipSync, deflateSync } from 'node:zlib';

// Minimum size to compress (1KB)
const MIN_SIZE = 1024;

// Content types that should be compressed
const COMPRESSIBLE_TYPES = [
    'application/json',
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
    'application/xml',
    'text/xml',
];

/**
 * Check if content type is compressible
 */
function isCompressible(contentType) {
    if (!contentType) return false;
    return COMPRESSIBLE_TYPES.some(type => contentType.includes(type));
}

/**
 * Get best encoding from Accept-Encoding header
 */
function getBestEncoding(acceptEncoding) {
    if (!acceptEncoding) return null;
    if (acceptEncoding.includes('gzip')) return 'gzip';
    if (acceptEncoding.includes('deflate')) return 'deflate';
    return null;
}

/**
 * Compress data based on encoding
 */
export function compress(data, encoding) {
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;

    if (encoding === 'gzip') {
        return gzipSync(buffer);
    }
    if (encoding === 'deflate') {
        return deflateSync(buffer);
    }
    return buffer;
}

/**
 * Compression middleware for Elysia
 * Add to your app with: app.use(compression)
 */
export function compression(app) {
    return app.onAfterHandle(({ request, set, response }) => {
        // Skip if no response or already compressed
        if (!response) return response;
        if (set.headers?.['content-encoding']) return response;

        // Get Accept-Encoding header
        const acceptEncoding = request.headers.get('accept-encoding');
        const encoding = getBestEncoding(acceptEncoding);

        if (!encoding) return response;

        // Get content type
        const contentType = set.headers?.['content-type'] ||
            set.headers?.['Content-Type'] ||
            'application/json';

        // Check if compressible
        if (!isCompressible(contentType)) return response;

        // Convert response to string/buffer
        let body;
        if (typeof response === 'object' && response !== null) {
            body = JSON.stringify(response);
        } else if (typeof response === 'string') {
            body = response;
        } else {
            return response;
        }

        // Skip small responses
        if (Buffer.byteLength(body) < MIN_SIZE) return response;

        // Compress
        const compressed = compress(body, encoding);

        return new Response(compressed, {
            headers: {
                'content-type': contentType,
                'content-encoding': encoding,
                'vary': 'Accept-Encoding',
            },
        });
    });
}
