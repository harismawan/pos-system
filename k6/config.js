// K6 Performance Test Configuration
// Environment configuration for different test scenarios

import { setResponseCallback, expectedStatuses } from "k6/http";

// Configure which HTTP statuses are considered "successful" for http_req_failed metric
// We include 400/401/403/404 since some tests intentionally check error handling
setResponseCallback(expectedStatuses({ min: 200, max: 404 }));

export const config = {
  // Base URL - can be overridden via K6_BASE_URL env var
  baseUrl: __ENV.K6_BASE_URL || "http://localhost:3000/api",

  // Test user credentials
  testUser: {
    username: __ENV.K6_USERNAME || "owner",
    password: __ENV.K6_PASSWORD || "password123",
  },

  // Thresholds for different test types
  thresholds: {
    // HTTP request failure rate should be less than 5%
    // Note: 4xx responses are now counted as "expected" due to setResponseCallback
    http_req_failed: ["rate<0.01"],
    // 95% of requests should be below 500ms
    http_req_duration: ["p(95)<500"],
  },

  // Default headers
  headers: {
    "Content-Type": "application/json",
  },
};

export default config;
