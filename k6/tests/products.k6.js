// Products API Performance Tests
import http from "k6/http";
import { check, group } from "k6";
import config from "../config.js";
import { ensureAuthenticated, getAuthHeaders } from "../helpers/auth.js";
import { thinkTime, uniqueId } from "../helpers/http.js";

export function productsTests() {
  ensureAuthenticated();
  const headers = getAuthHeaders();
  let createdProductId = null;

  group("Products API", () => {
    // List products
    group("GET /products", () => {
      const res = http.get(`${config.baseUrl}/products?page=1&limit=20`, {
        headers,
      });
      check(res, {
        "list products status is 200": (r) => r.status === 200,
        "list products returns data": (r) =>
          r.json().data?.products !== undefined,
      });
      thinkTime();
    });

    // List products with filters
    group("GET /products (with filters)", () => {
      const res = http.get(
        `${config.baseUrl}/products?isActive=true&search=test`,
        { headers },
      );
      check(res, {
        "filtered products status is 200": (r) => r.status === 200,
      });
      thinkTime();
    });

    // Create product
    group("POST /products", () => {
      const uniqueSku = `K6-${uniqueId()}`;
      const res = http.post(
        `${config.baseUrl}/products`,
        JSON.stringify({
          sku: uniqueSku,
          barcode: `${Date.now()}`,
          name: "K6 Test Product",
          description: "Created by k6 performance test",
          category: "Testing",
          unit: "pcs",
          basePrice: 10000,
          costPrice: 8000,
          taxRate: 11,
          isActive: true,
        }),
        { headers },
      );
      check(res, {
        "create product status is 200 or 201": (r) =>
          r.status === 200 || r.status === 201,
      });
      if (res.status === 200 || res.status === 201) {
        createdProductId = res.json().data?.id;
      }
      thinkTime();
    });

    // Get product by ID
    if (createdProductId) {
      group("GET /products/:id", () => {
        const res = http.get(`${config.baseUrl}/products/${createdProductId}`, {
          headers,
        });
        check(res, {
          "get product status is 200": (r) => r.status === 200,
          "get product returns data": (r) =>
            r.json().data?.id === createdProductId,
        });
        thinkTime();
      });

      // Update product
      group("PUT /products/:id", () => {
        const res = http.put(
          `${config.baseUrl}/products/${createdProductId}`,
          JSON.stringify({ name: "K6 Updated Product", basePrice: 12000 }),
          { headers },
        );
        check(res, {
          "update product status is 200": (r) => r.status === 200,
        });
        thinkTime();
      });

      // Delete product (soft delete)
      group("DELETE /products/:id", () => {
        const res = http.del(
          `${config.baseUrl}/products/${createdProductId}`,
          null,
          { headers },
        );
        check(res, {
          "delete product status is 200": (r) => r.status === 200,
        });
        thinkTime();
      });
    }
  });
}

export default productsTests;
