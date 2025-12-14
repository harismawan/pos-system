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
  // const outletId = getOutletId(); // Use stable data fetch instead
  let outletId = null;
  let createdPoId = null;
  let supplierId = null;
  let warehouseId = null;
  let productId = null;

  group("Purchase Orders API", () => {
    // Get existing data for testing (filter out K6 test data to avoid concurrency issues)
    const suppliersRes = http.get(`${config.baseUrl}/suppliers?limit=100`, {
      headers: headersWithOutlet,
    });
    if (suppliersRes.status === 200 && suppliersRes.json().data.suppliers) {
      const suppliers = suppliersRes.json().data.suppliers;
      const stableSupplier = suppliers.find((s) => !s.name.includes("K6"));
      supplierId = stableSupplier ? stableSupplier.id : suppliers[0]?.id;
    }

    // Get Sample Products 1 and 2 for testing (consistent known products)
    const productsRes = http.get(
      `${config.baseUrl}/products?search=Sample%20Product&limit=10`,
      {
        headers: headersWithOutlet,
      },
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

    const outletsRes = http.get(`${config.baseUrl}/outlets?limit=100`, {
      headers: headersWithOutlet,
    });
    if (outletsRes.status === 200 && outletsRes.json().data.outlets) {
      const outlets = outletsRes.json().data.outlets;
      const stableOutlet = outlets.find((o) => !o.name.includes("K6"));
      outletId = stableOutlet ? stableOutlet.id : outlets[0]?.id;
    }

    // Find warehouse for this outlet (search for 'Main' for consistency)
    if (outletId) {
      const warehousesRes = http.get(
        `${config.baseUrl}/warehouses?outletId=${outletId}&search=Main&limit=1`,
        { headers: headersWithOutlet },
      );
      if (
        warehousesRes.status === 200 &&
        warehousesRes.json().data?.warehouses?.length > 0
      ) {
        warehouseId = warehousesRes.json().data.warehouses[0].id;
      }
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
