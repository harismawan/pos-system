// Customers API Performance Tests
import http from "k6/http";
import { check, group } from "k6";
import config from "../config.js";
import { ensureAuthenticated, getAuthHeaders } from "../helpers/auth.js";
import { thinkTime, uniqueId } from "../helpers/http.js";

export function customersTests() {
  ensureAuthenticated();
  const headers = getAuthHeaders();
  let createdCustomerId = null;

  group("Customers API", () => {
    // List customers
    group("GET /customers", () => {
      const res = http.get(`${config.baseUrl}/customers?page=1&limit=20`, {
        headers,
      });
      check(res, {
        "list customers status is 200": (r) => r.status === 200,
        "list customers returns data": (r) =>
          r.json().data?.customers !== undefined,
      });
      thinkTime();
    });

    // List customers with search
    group("GET /customers (with search)", () => {
      const res = http.get(`${config.baseUrl}/customers?search=test`, {
        headers,
      });
      check(res, {
        "search customers status is 200": (r) => r.status === 200,
      });
      thinkTime();
    });

    // Create customer
    group("POST /customers", () => {
      const uniqueEmail = `k6-${uniqueId()}@test.local`;
      const res = http.post(
        `${config.baseUrl}/customers`,
        JSON.stringify({
          name: "K6 Test Customer",
          email: uniqueEmail,
          phone: "+62 812 0000 0000",
          addressLine1: "123 K6 Test Street",
          city: "Jakarta",
          isMember: false,
        }),
        { headers },
      );
      check(res, {
        "create customer status is 200 or 201": (r) =>
          r.status === 200 || r.status === 201,
      });
      if (res.status === 200 || res.status === 201) {
        createdCustomerId = res.json().data?.id;
      }
      thinkTime();
    });

    // Get customer by ID
    if (createdCustomerId) {
      group("GET /customers/:id", () => {
        const res = http.get(
          `${config.baseUrl}/customers/${createdCustomerId}`,
          { headers },
        );
        check(res, {
          "get customer status is 200": (r) => r.status === 200,
          "get customer returns data": (r) =>
            r.json().data?.id === createdCustomerId,
        });
        thinkTime();
      });

      // Update customer
      group("PUT /customers/:id", () => {
        const res = http.put(
          `${config.baseUrl}/customers/${createdCustomerId}`,
          JSON.stringify({ name: "K6 Updated Customer", isMember: true }),
          { headers },
        );
        check(res, {
          "update customer status is 200": (r) => r.status === 200,
        });
        thinkTime();
      });

      // Delete customer
      group("DELETE /customers/:id", () => {
        const res = http.del(
          `${config.baseUrl}/customers/${createdCustomerId}`,
          null,
          { headers },
        );
        check(res, {
          "delete customer responds": (r) =>
            r.status === 200 || r.status === 400,
        });
        thinkTime();
      });
    }
  });
}

export default customersTests;
