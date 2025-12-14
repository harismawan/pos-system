// Super Admin API Performance Tests
import http from "k6/http";
import { check, group } from "k6";
import config from "../config.js";
import { getSuperAdminAuthHeaders } from "../helpers/auth.js";
import { thinkTime } from "../helpers/http.js";

export function superAdminTests() {
  // Get superadmin headers (uses separate auth session)
  const headers = getSuperAdminAuthHeaders();
  let businessId = null;
  let userId = null;

  group("Super Admin API", () => {
    // Get dashboard stats
    group("GET /super-admin/dashboard", () => {
      const res = http.get(`${config.baseUrl}/super-admin/dashboard`, {
        headers,
      });
      check(res, {
        "dashboard responds": (r) => r.status === 200 || r.status === 403,
      });
      thinkTime();
    });

    // List businesses
    group("GET /super-admin/businesses", () => {
      const res = http.get(
        `${config.baseUrl}/super-admin/businesses?page=1&limit=20`,
        { headers },
      );
      check(res, {
        "list businesses responds": (r) => r.status === 200 || r.status === 403,
      });
      if (res.status === 200 && res.json().data?.businesses?.length > 0) {
        businessId = res.json().data.businesses[0].id;
      }
      thinkTime();
    });

    // Get business by ID
    if (businessId) {
      group("GET /super-admin/businesses/:id", () => {
        const res = http.get(
          `${config.baseUrl}/super-admin/businesses/${businessId}`,
          { headers },
        );
        check(res, {
          "get business responds": (r) => r.status === 200 || r.status === 403,
        });
        thinkTime();
      });
    }

    // List all users
    group("GET /super-admin/users", () => {
      const res = http.get(
        `${config.baseUrl}/super-admin/users?page=1&limit=20`,
        { headers },
      );
      check(res, {
        "list all users responds": (r) => r.status === 200 || r.status === 403,
      });
      if (res.status === 200 && res.json().data?.users?.length > 0) {
        userId = res.json().data.users[0].id;
      }
      thinkTime();
    });

    // Get user by ID
    if (userId) {
      group("GET /super-admin/users/:id", () => {
        const res = http.get(`${config.baseUrl}/super-admin/users/${userId}`, {
          headers,
        });
        check(res, {
          "get user responds": (r) => r.status === 200 || r.status === 403,
        });
        thinkTime();
      });

      // Get user sessions
      group("GET /super-admin/users/:id/sessions", () => {
        const res = http.get(
          `${config.baseUrl}/super-admin/users/${userId}/sessions`,
          { headers },
        );
        check(res, {
          "get user sessions responds": (r) =>
            r.status === 200 || r.status === 403,
        });
        thinkTime();
      });
    }
  });
}

export default superAdminTests;
