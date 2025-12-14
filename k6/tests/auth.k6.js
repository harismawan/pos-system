// Auth API Performance Tests
import http from "k6/http";
import { check, group } from "k6";
import config from "../config.js";
import {
  ensureAuthenticated,
  getAuthHeaders,
  getRefreshToken,
  resetAuth,
} from "../helpers/auth.js";
import { thinkTime } from "../helpers/http.js";

export function authTests() {
  group("Auth API", () => {
    // Login
    // group('POST /auth/login', () => {
    //     const res = http.post(
    //         `${config.baseUrl}/auth/login`,
    //         JSON.stringify({
    //             username: config.testUser.username,
    //             password: config.testUser.password,
    //         }),
    //         { headers: config.headers }
    //     );
    //     check(res, {
    //         'login status is 200': (r) => r.status === 200,
    //         'login returns tokens': (r) => r.json().data?.accessToken !== undefined,
    //         'login returns user': (r) => r.json().data?.user?.id !== undefined,
    //     });
    //     thinkTime();
    // });

    // Setup auth for subsequent requests
    ensureAuthenticated();

    // Get current user
    group("GET /auth/me", () => {
      const res = http.get(`${config.baseUrl}/auth/me`, {
        headers: getAuthHeaders(),
      });
      check(res, {
        "me status is 200": (r) => r.status === 200,
        "me returns user data": (r) => r.json().data?.user?.id !== undefined,
      });
      thinkTime();
    });

    // Refresh token
    // group('POST /auth/refresh', () => {
    //     const res = http.post(
    //         `${config.baseUrl}/auth/refresh`,
    //         JSON.stringify({ refreshToken: getRefreshToken() }),
    //         { headers: config.headers }
    //     );
    //     check(res, {
    //         'refresh status is 200': (r) => r.status === 200,
    //         'refresh returns new tokens': (r) => r.json().data?.accessToken !== undefined,
    //     });
    //     thinkTime();
    // });

    // Logout (SKIPPED: perform at end of test scenario to allow token reuse)
    /*
        group('POST /auth/logout', () => {
            const res = http.post(`${config.baseUrl}/auth/logout`, null, { headers: getAuthHeaders() });
            check(res, {
                'logout status is 200': (r) => r.status === 200,
            });
            thinkTime();
        });
        */

    // NOTE: Skipping forgot-password and reset-password tests as they trigger emails

    // resetAuth(); // Keep auth state for subsequent tests
  });
}

export default authTests;
