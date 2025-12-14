/**
 * Metrics Middleware
 * Tracks HTTP request duration and response codes
 *
 * When metrics are disabled, this middleware is a no-op
 */

import {
  isMetricsEnabled,
  incrementActiveConnections,
  decrementActiveConnections,
  recordHttpRequest,
} from "./metrics.js";

/**
 * Creates a metrics tracking middleware for Elysia
 * Tracks request duration, method, path, status, and response codes
 */
export function metricsMiddleware(app) {
  // Skip middleware entirely when metrics are disabled
  if (!isMetricsEnabled()) {
    return app;
  }

  return app
    .onRequest(({ store }) => {
      // Track start time
      store.requestStart = performance.now();
      // Increment active connections
      incrementActiveConnections();
    })
    .onAfterResponse(({ request, set, store, response }) => {
      // Decrement active connections
      decrementActiveConnections();

      // Calculate duration
      const duration = performance.now() - (store.requestStart || 0);

      // Extract response code from response body if present
      let responseCode = null;
      if (response && typeof response === "object" && response.code) {
        responseCode = response.code;
      }

      // Get status code
      const status = set.status || 200;

      // Get path from URL
      const url = new URL(request.url);
      const path = url.pathname;

      // Skip metrics endpoint itself to avoid recursion
      if (path === "/metrics") {
        return;
      }

      // Record metrics
      recordHttpRequest(request.method, path, status, duration, responseCode);
    });
}

export default metricsMiddleware;
