// Purchase Orders API Performance Tests
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

export function purchaseOrdersTests() {
  ensureAuthenticated();
  const headers = getAuthHeaders();
  const headersWithOutlet = getAuthHeadersWithOutlet();
  const outletId = getOutletId();
  let createdPoId = null;
  let supplierId = null;
  let warehouseId = null;
  let productId = null;

  group("Purchase Orders API", () => {
    // Get existing data for testing
    const suppliersRes = http.get(`${config.baseUrl}/suppliers?limit=1`, {
      headers,
    });
    if (
      suppliersRes.status === 200 &&
      suppliersRes.json().data?.suppliers?.length > 0
    ) {
      supplierId = suppliersRes.json().data.suppliers[0].id;
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

    const productsRes = http.get(`${config.baseUrl}/products?limit=1`, {
      headers,
    });
    if (
      productsRes.status === 200 &&
      productsRes.json().data?.products?.length > 0
    ) {
      productId = productsRes.json().data.products[0].id;
    }

    // List purchase orders
    group("GET /purchase-orders", () => {
      const res = http.get(
        `${config.baseUrl}/purchase-orders?page=1&limit=20`,
        { headers: headersWithOutlet },
      );
      check(res, {
        "list purchase orders status is 200": (r) => r.status === 200,
        "list purchase orders returns data": (r) =>
          r.json().data?.orders !== undefined,
      });
      thinkTime();
    });

    // List purchase orders with filters
    group("GET /purchase-orders (with filters)", () => {
      const res = http.get(`${config.baseUrl}/purchase-orders?status=DRAFT`, {
        headers: headersWithOutlet,
      });
      check(res, {
        "filtered purchase orders status is 200": (r) => r.status === 200,
      });
      thinkTime();
    });

    // Create purchase order
    if (supplierId && warehouseId && productId && outletId) {
      group("POST /purchase-orders", () => {
        const res = http.post(
          `${config.baseUrl}/purchase-orders`,
          JSON.stringify({
            supplierId: supplierId,
            warehouseId: warehouseId,
            outletId: outletId,
            orderDate: new Date().toISOString().split("T")[0],
            expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
            notes: "K6 performance test PO",
            items: [
              {
                productId: productId,
                quantityOrdered: 10,
                unitCost: 5000,
              },
            ],
          }),
          { headers: headersWithOutlet },
        );
        check(res, {
          "create PO status is 200 or 201": (r) =>
            r.status === 200 || r.status === 201,
        });
        if (res.status === 200 || res.status === 201) {
          createdPoId = res.json().data?.id;
        }
        thinkTime();
      });

      // Get purchase order by ID
      if (createdPoId) {
        group("GET /purchase-orders/:id", () => {
          const res = http.get(
            `${config.baseUrl}/purchase-orders/${createdPoId}`,
            { headers },
          );
          check(res, {
            "get PO status is 200": (r) => r.status === 200,
            "get PO returns data": (r) => r.json().data?.id === createdPoId,
          });
          thinkTime();
        });

        // Update purchase order
        group("PUT /purchase-orders/:id", () => {
          const res = http.put(
            `${config.baseUrl}/purchase-orders/${createdPoId}`,
            JSON.stringify({ notes: "K6 updated notes" }),
            { headers },
          );
          check(res, {
            "update PO status is 200": (r) => r.status === 200,
          });
          thinkTime();
        });

        // Cancel purchase order
        group("POST /purchase-orders/:id/cancel", () => {
          const res = http.post(
            `${config.baseUrl}/purchase-orders/${createdPoId}/cancel`,
            null,
            { headers },
          );
          check(res, {
            "cancel PO responds": (r) => r.status === 200 || r.status === 400,
          });
          thinkTime();
        });
      }
    }
  });
}

export default purchaseOrdersTests;
