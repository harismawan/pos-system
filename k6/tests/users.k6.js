// Users API Performance Tests
import http from "k6/http";
import { check, group } from "k6";
import config from "../config.js";
import { ensureAuthenticated, getAuthHeaders } from "../helpers/auth.js";
import { thinkTime, uniqueId } from "../helpers/http.js";

export function usersTests() {
  ensureAuthenticated();
  const headers = getAuthHeaders();
  let createdUserId = null;

  group("Users API", () => {
    // List users
    group("GET /users", () => {
      const res = http.get(`${config.baseUrl}/users`, { headers });
      check(res, {
        "list users status is 200": (r) => r.status === 200,
        "list users returns array": (r) => Array.isArray(r.json().data?.users),
      });
      thinkTime();
    });

    // Create user
    group("POST /users", () => {
      const uniqueUsername = `k6user${uniqueId()}`;
      const res = http.post(
        `${config.baseUrl}/users`,
        JSON.stringify({
          username: uniqueUsername,
          password: "TestPass123!",
          email: `${uniqueUsername}@k6test.local`,
          name: "K6 Test User",
          role: "CASHIER",
        }),
        { headers },
      );
      check(res, {
        "create user status is 200 or 201": (r) =>
          r.status === 200 || r.status === 201,
      });
      if (res.status === 200 || res.status === 201) {
        createdUserId = res.json().data?.id;
      }
      thinkTime();
    });

    // Get user by ID
    if (createdUserId) {
      group("GET /users/:id", () => {
        const res = http.get(`${config.baseUrl}/users/${createdUserId}`, {
          headers,
        });
        check(res, {
          "get user status is 200": (r) => r.status === 200,
          "get user returns user data": (r) =>
            r.json().data?.id === createdUserId,
        });
        thinkTime();
      });

      // Update user
      group("PUT /users/:id", () => {
        const res = http.put(
          `${config.baseUrl}/users/${createdUserId}`,
          JSON.stringify({ name: "K6 Updated User" }),
          { headers },
        );
        check(res, {
          "update user status is 200": (r) => r.status === 200,
        });
        thinkTime();
      });

      // Delete user
      group("DELETE /users/:id", () => {
        const res = http.del(`${config.baseUrl}/users/${createdUserId}`, null, {
          headers,
        });
        check(res, {
          "delete user status is 200": (r) => r.status === 200,
        });
        thinkTime();
      });
    }
  });
}

export default usersTests;
