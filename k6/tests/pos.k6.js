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
    // Get existing data for testing (search for 'Main' warehouse for consistency)
    if (outletId) {
      const warehousesRes = http.get(
        `${config.baseUrl}/warehouses?outletId=${outletId}&search=Main&limit=1`,
        { headers },
      );
      if (
        warehousesRes.status === 200 &&
        warehousesRes.json().data?.warehouses?.length > 0
      ) {
        warehouseId = warehousesRes.json().data.warehouses[0].id;
      }
    }

    // Get Sample Products 1 and 2 for testing (consistent known products)
    const productsRes = http.get(
      `${config.baseUrl}/products?search=Sample%20Product&limit=10&isActive=true`,
      { headers },
    );
    let productIds = [];
    if (productsRes.status === 200 && productsRes.json().data?.products) {
      const products = productsRes.json().data.products;
      // Filter for Sample Product 1 or 2
      const sampleProducts = products.filter(
        (p) => p.name === "Sample Product 1" || p.name === "Sample Product 2",
      );
      productIds = sampleProducts.map((p) => p.id);
      productId = productIds[0] || products[0]?.id;
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
