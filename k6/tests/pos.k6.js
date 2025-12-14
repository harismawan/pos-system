// POS/Sales API Performance Tests
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

export function posTests() {
  ensureAuthenticated();
  const headers = getAuthHeaders();
  const headersWithOutlet = getAuthHeadersWithOutlet();
  const outletId = getOutletId();
  let createdOrderId = null;
  let warehouseId = null;
  let productId = null;

  group("POS/Sales API", () => {
    // Get existing data for testing
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

    const productsRes = http.get(
      `${config.baseUrl}/products?limit=1&isActive=true`,
      { headers },
    );
    if (
      productsRes.status === 200 &&
      productsRes.json().data?.products?.length > 0
    ) {
      productId = productsRes.json().data.products[0].id;
    }

    // List POS orders
    group("GET /sales/orders", () => {
      const res = http.get(`${config.baseUrl}/sales/orders?page=1&limit=20`, {
        headers: headersWithOutlet,
      });
      check(res, {
        "list POS orders status is 200": (r) => r.status === 200,
        "list POS orders returns data": (r) =>
          r.json().data?.orders !== undefined,
      });
      thinkTime();
    });

    // List POS orders with filters
    group("GET /sales/orders (with filters)", () => {
      const res = http.get(`${config.baseUrl}/sales/orders?status=COMPLETED`, {
        headers: headersWithOutlet,
      });
      check(res, {
        "filtered POS orders status is 200": (r) => r.status === 200,
      });
      thinkTime();
    });

    // Create POS order
    if (outletId && warehouseId && productId) {
      group("POST /sales/orders", () => {
        const res = http.post(
          `${config.baseUrl}/sales/orders`,
          JSON.stringify({
            outletId: outletId,
            warehouseId: warehouseId,
            registerId: null,
            customerId: null,
            notes: "K6 performance test order",
            items: [
              {
                productId: productId,
                quantity: 1,
                discountAmount: 0,
              },
            ],
          }),
          { headers: headersWithOutlet },
        );
        check(res, {
          "create POS order status is 200 or 201": (r) =>
            r.status === 200 || r.status === 201,
        });
        if (res.status === 200 || res.status === 201) {
          createdOrderId = res.json().data?.id;
        }
        thinkTime();
      });

      // Get POS order by ID
      if (createdOrderId) {
        group("GET /sales/orders/:id", () => {
          const res = http.get(
            `${config.baseUrl}/sales/orders/${createdOrderId}`,
            { headers },
          );
          check(res, {
            "get POS order status is 200": (r) => r.status === 200,
            "get POS order returns data": (r) =>
              r.json().data?.id === createdOrderId,
          });
          thinkTime();
        });

        // Add payment to order
        group("POST /sales/orders/:id/payments", () => {
          const res = http.post(
            `${config.baseUrl}/sales/orders/${createdOrderId}/payments`,
            JSON.stringify({
              method: "CASH",
              amount: 100000,
              reference: "K6-TEST",
            }),
            { headers },
          );
          check(res, {
            "add payment responds": (r) => r.status === 200 || r.status === 201,
          });
          thinkTime();
        });

        // Cancel POS order (cleanup)
        group("POST /sales/orders/:id/cancel", () => {
          const res = http.post(
            `${config.baseUrl}/sales/orders/${createdOrderId}/cancel`,
            null,
            { headers: headersWithOutlet },
          );
          check(res, {
            "cancel POS order responds": (r) =>
              r.status === 200 || r.status === 400,
          });
          thinkTime();
        });
      }
    }
  });
}

export default posTests;
