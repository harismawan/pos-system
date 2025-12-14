// Warehouses API Performance Tests
import http from "k6/http";
import { check, group } from "k6";
import config from "../config.js";
import {
  ensureAuthenticated,
  getAuthHeaders,
  getOutletId,
} from "../helpers/auth.js";
import { thinkTime, uniqueId } from "../helpers/http.js";

export function warehousesTests() {
  ensureAuthenticated();
  const headers = getAuthHeaders();
  const outletId = getOutletId();
  let createdWarehouseId = null;
  let existingWarehouseId = null;

  group("Warehouses API", () => {
    // List warehouses (search for 'Main')
    group("GET /warehouses", () => {
      const url = outletId
        ? `${config.baseUrl}/warehouses?outletId=${outletId}&search=Main&limit=1`
        : `${config.baseUrl}/warehouses?search=Main&limit=1`;
      const res = http.get(url, { headers });
      check(res, {
        "list warehouses status is 200": (r) => r.status === 200,
        "list warehouses returns data": (r) =>
          r.json().data?.warehouses !== undefined,
      });
      if (res.status === 200 && res.json().data?.warehouses) {
        // Since we searched for 'Main', the first result should be the correct one
        // and importantly, it's not a K6 test warehouse (assuming 'Main' is seeded/stable)
        const warehouses = res.json().data.warehouses;
        existingWarehouseId = warehouses[0]?.id;
      }
      thinkTime();
    });

    // Get warehouse by ID
    if (existingWarehouseId) {
      group("GET /warehouses/:id", () => {
        const res = http.get(
          `${config.baseUrl}/warehouses/${existingWarehouseId}`,
          { headers },
        );
        check(res, {
          "get warehouse status is 200": (r) => r.status === 200,
          "get warehouse returns data": (r) =>
            r.json().data?.id === existingWarehouseId,
        });
        thinkTime();
      });

      // Get warehouse inventory
      group("GET /warehouses/:id/inventory", () => {
        const res = http.get(
          `${config.baseUrl}/warehouses/${existingWarehouseId}/inventory`,
          { headers },
        );
        check(res, {
          "get warehouse inventory status is 200": (r) => r.status === 200,
        });
        thinkTime();
      });
    }

    // Create warehouse
    if (outletId) {
      group("POST /warehouses", () => {
        // Generate unique code: WH-K6-timestamp(last 4)-random(3)
        const timestamp = Date.now().toString().slice(-4);
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        const uniqueCode = `WH-K6-${timestamp}-${random}`;
        const res = http.post(
          `${config.baseUrl}/warehouses`,
          JSON.stringify({
            outletId: outletId,
            name: "K6 Test Warehouse",
            code: uniqueCode,
            addressLine1: "789 K6 Warehouse St",
            type: "OUTLET",
            isDefault: false,
            isActive: true,
          }),
          { headers },
        );
        check(res, {
          "create warehouse status is 200 or 201": (r) =>
            r.status === 200 || r.status === 201,
        });
        if (res.status === 200 || res.status === 201) {
          createdWarehouseId = res.json().data?.id;
        }
        thinkTime();
      });

      // Update warehouse
      if (createdWarehouseId) {
        group("PUT /warehouses/:id", () => {
          const res = http.put(
            `${config.baseUrl}/warehouses/${createdWarehouseId}`,
            JSON.stringify({ name: "K6 Updated Warehouse" }),
            { headers },
          );
          check(res, {
            "update warehouse status is 200": (r) => r.status === 200,
          });
          thinkTime();
        });

        // Delete warehouse
        group("DELETE /warehouses/:id", () => {
          const res = http.del(
            `${config.baseUrl}/warehouses/${createdWarehouseId}`,
            null,
            { headers },
          );
          check(res, {
            "delete warehouse responds": (r) =>
              r.status === 200 || r.status === 400,
          });
          thinkTime();
        });
      }
    }
  });
}

export default warehousesTests;
