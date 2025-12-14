// Outlets API Performance Tests
import http from "k6/http";
import { check, group } from "k6";
import config from "../config.js";
import {
  ensureAuthenticated,
  getAuthHeaders,
  getOutletId,
} from "../helpers/auth.js";
import { thinkTime, uniqueId } from "../helpers/http.js";

export function outletsTests() {
  ensureAuthenticated();
  const headers = getAuthHeaders();
  let createdOutletId = null;

  group("Outlets API", () => {
    // List outlets
    group("GET /outlets", () => {
      const res = http.get(`${config.baseUrl}/outlets?isActive=true`, {
        headers,
      });
      check(res, {
        "list outlets status is 200": (r) => r.status === 200,
        "list outlets returns data": (r) =>
          r.json().data?.outlets !== undefined,
      });
      thinkTime();
    });

    // Get outlet by ID
    const outletId = getOutletId();
    if (outletId) {
      group("GET /outlets/:id", () => {
        const res = http.get(`${config.baseUrl}/outlets/${outletId}`, {
          headers,
        });
        check(res, {
          "get outlet status is 200": (r) => r.status === 200,
          "get outlet returns data": (r) => r.json().data?.id === outletId,
        });
        thinkTime();
      });

      // Get outlet users
      group("GET /outlets/:id/users", () => {
        const res = http.get(`${config.baseUrl}/outlets/${outletId}/users`, {
          headers,
        });
        check(res, {
          "get outlet users status is 200": (r) => r.status === 200,
          "get outlet users returns array": (r) => Array.isArray(r.json().data),
        });
        thinkTime();
      });
    }

    // Create outlet
    group("POST /outlets", () => {
      // Generate unique code: K6-timestamp(last 4)-random(3)
      const timestamp = Date.now().toString().slice(-4);
      const random = Math.random().toString(36).substring(2, 5).toUpperCase();
      const uniqueCode = `K6-${timestamp}-${random}`;
      const res = http.post(
        `${config.baseUrl}/outlets`,
        JSON.stringify({
          name: "K6 Test Outlet",
          code: uniqueCode,
          addressLine1: "456 K6 Test Avenue",
          city: "Jakarta",
          phone: "+62 21 000 0000",
          isActive: true,
        }),
        { headers },
      );
      check(res, {
        "create outlet status is 200 or 201": (r) =>
          r.status === 200 || r.status === 201,
      });
      if (res.status === 200 || res.status === 201) {
        createdOutletId = res.json().data?.id;
      }
      thinkTime();
    });

    // Update outlet
    if (createdOutletId) {
      group("PUT /outlets/:id", () => {
        const res = http.put(
          `${config.baseUrl}/outlets/${createdOutletId}`,
          JSON.stringify({ name: "K6 Updated Outlet" }),
          { headers },
        );
        check(res, {
          "update outlet status is 200": (r) => r.status === 200,
        });
        thinkTime();
      });

      // Delete outlet (may fail if outlet has data)
      group("DELETE /outlets/:id", () => {
        const res = http.del(
          `${config.baseUrl}/outlets/${createdOutletId}`,
          null,
          { headers },
        );
        check(res, {
          "delete outlet responds": (r) => r.status === 200 || r.status === 400,
        });
        thinkTime();
      });
    }
  });
}

export default outletsTests;
