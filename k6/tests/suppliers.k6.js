// Suppliers API Performance Tests
import http from "k6/http";
import { check, group } from "k6";
import config from "../config.js";
import { ensureAuthenticated, getAuthHeaders } from "../helpers/auth.js";
import { thinkTime, uniqueId } from "../helpers/http.js";

export function suppliersTests() {
  ensureAuthenticated();
  const headers = getAuthHeaders();
  let createdSupplierId = null;

  group("Suppliers API", () => {
    // List suppliers
    group("GET /suppliers", () => {
      const res = http.get(`${config.baseUrl}/suppliers?page=1&limit=20`, {
        headers,
      });
      check(res, {
        "list suppliers status is 200": (r) => r.status === 200,
        "list suppliers returns data": (r) =>
          r.json().data?.suppliers !== undefined,
      });
      thinkTime();
    });

    // List suppliers with search
    group("GET /suppliers (with search)", () => {
      const res = http.get(
        `${config.baseUrl}/suppliers?search=test&isActive=true`,
        { headers },
      );
      check(res, {
        "search suppliers status is 200": (r) => r.status === 200,
      });
      thinkTime();
    });

    // Create supplier
    group("POST /suppliers", () => {
      const uniqueName = `K6 Supplier ${uniqueId()}`;
      const res = http.post(
        `${config.baseUrl}/suppliers`,
        JSON.stringify({
          name: uniqueName,
          contactPerson: "K6 Test Contact",
          email: `supplier-${uniqueId()}@k6test.local`,
          phone: "+62 21 111 2222",
          addressLine1: "123 Supplier Street",
          city: "Jakarta",
          isActive: true,
        }),
        { headers },
      );
      check(res, {
        "create supplier status is 200 or 201": (r) =>
          r.status === 200 || r.status === 201,
      });
      if (res.status === 200 || res.status === 201) {
        createdSupplierId = res.json().data?.id;
      }
      thinkTime();
    });

    // Get supplier by ID
    if (createdSupplierId) {
      group("GET /suppliers/:id", () => {
        const res = http.get(
          `${config.baseUrl}/suppliers/${createdSupplierId}`,
          { headers },
        );
        check(res, {
          "get supplier status is 200": (r) => r.status === 200,
          "get supplier returns data": (r) =>
            r.json().data?.id === createdSupplierId,
        });
        thinkTime();
      });

      // Update supplier
      group("PUT /suppliers/:id", () => {
        const res = http.put(
          `${config.baseUrl}/suppliers/${createdSupplierId}`,
          JSON.stringify({ contactPerson: "K6 Updated Contact" }),
          { headers },
        );
        check(res, {
          "update supplier status is 200": (r) => r.status === 200,
        });
        thinkTime();
      });

      // Delete supplier
      group("DELETE /suppliers/:id", () => {
        const res = http.del(
          `${config.baseUrl}/suppliers/${createdSupplierId}`,
          null,
          { headers },
        );
        check(res, {
          "delete supplier responds": (r) =>
            r.status === 200 || r.status === 400,
        });
        thinkTime();
      });
    }
  });
}

export default suppliersTests;
