// Inventory API Performance Tests
import http from "k6/http";
import { check, group } from "k6";
import config from "../config.js";
import {
  ensureAuthenticated,
  getAuthHeaders,
  getAuthHeadersWithOutlet,
  getOutletId,
} from "../helpers/auth.js";
import { thinkTime } from "../helpers/http.js";

export function inventoryTests() {
  ensureAuthenticated();
  const headers = getAuthHeaders();
  const headersWithOutlet = getAuthHeadersWithOutlet();
  const outletId = getOutletId();
  let productId = null;
  let warehouseId = null;

  group("Inventory API", () => {
    // Get existing product and warehouse for testing
    const productsRes = http.get(`${config.baseUrl}/products?limit=1`, {
      headers,
    });
    if (
      productsRes.status === 200 &&
      productsRes.json().data?.products?.length > 0
    ) {
      productId = productsRes.json().data.products[0].id;
    }

    if (outletId) {
      const warehousesRes = http.get(
        `${config.baseUrl}/warehouses?outletId=${outletId}&limit=1`,
        { headers },
      );
      if (
        warehousesRes.status === 200 &&
        warehousesRes.json().data?.warehouses?.length > 0
      ) {
        warehouseId = warehousesRes.json().data.warehouses[0].id;
      }
    }

    // List inventory
    group("GET /inventory", () => {
      const res = http.get(`${config.baseUrl}/inventory?page=1&limit=20`, {
        headers: headersWithOutlet,
      });
      check(res, {
        "list inventory status is 200": (r) => r.status === 200,
        "list inventory returns data": (r) =>
          r.json().data?.inventories !== undefined,
      });
      thinkTime();
    });

    // List inventory with filters
    group("GET /inventory (with filters)", () => {
      let url = `${config.baseUrl}/inventory?lowStock=true`;
      if (warehouseId) url += `&warehouseId=${warehouseId}`;
      const res = http.get(url, { headers: headersWithOutlet });
      check(res, {
        "filtered inventory status is 200": (r) => r.status === 200,
      });
      thinkTime();
    });

    // Get stock movements
    group("GET /inventory/movements", () => {
      const res = http.get(
        `${config.baseUrl}/inventory/movements?page=1&limit=20`,
        { headers: headersWithOutlet },
      );
      check(res, {
        "stock movements status is 200": (r) => r.status === 200,
        "stock movements returns data": (r) =>
          r.json().data?.movements !== undefined ||
          Array.isArray(r.json().data),
      });
      thinkTime();
    });

    // Adjust inventory (only if we have product and warehouse)
    if (productId && warehouseId && outletId) {
      group("POST /inventory/adjust", () => {
        const res = http.post(
          `${config.baseUrl}/inventory/adjust`,
          JSON.stringify({
            productId: productId,
            warehouseId: warehouseId,
            outletId: outletId,
            type: "ADJUSTMENT_IN",
            quantity: 1,
            notes: "K6 performance test adjustment",
          }),
          { headers: headersWithOutlet },
        );
        check(res, {
          "adjust inventory responds": (r) =>
            r.status === 200 || r.status === 400 || r.status === 404,
        });
        thinkTime();
      });
    }

    // Stock take
    if (productId && warehouseId) {
      group("POST /inventory/stock-take", () => {
        const res = http.post(
          `${config.baseUrl}/inventory/stock-take`,
          JSON.stringify({
            warehouseId: warehouseId,
            items: [{ productId: productId, physicalQuantity: 100 }],
            notes: "K6 performance test stock take",
          }),
          { headers: headersWithOutlet },
        );
        check(res, {
          "stock take responds": (r) =>
            r.status === 200 || r.status === 400 || r.status === 404,
        });
        thinkTime();
      });
    }
  });
}

export default inventoryTests;
