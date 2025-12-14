// Pricing API Performance Tests
import http from "k6/http";
import { check, group } from "k6";
import config from "../config.js";
import {
  ensureAuthenticated,
  getAuthHeaders,
  getOutletId,
} from "../helpers/auth.js";
import { thinkTime, uniqueId } from "../helpers/http.js";

export function pricingTests() {
  ensureAuthenticated();
  const headers = getAuthHeaders();
  let createdTierId = null;
  let productId = null;

  group("Pricing API", () => {
    // Get existing product for testing
    const productsRes = http.get(`${config.baseUrl}/products?limit=1`, {
      headers,
    });
    if (
      productsRes.status === 200 &&
      productsRes.json().data?.products?.length > 0
    ) {
      productId = productsRes.json().data.products[0].id;
    }

    // List price tiers
    group("GET /pricing/tiers", () => {
      const res = http.get(`${config.baseUrl}/pricing/tiers`, { headers });
      check(res, {
        "list tiers status is 200": (r) => r.status === 200,
        "list tiers returns array": (r) => Array.isArray(r.json().data),
      });
      thinkTime();
    });

    // Create price tier
    group("POST /pricing/tiers", () => {
      // Generate shorter but unique code: K6 + last 5 digits of timestamp + 3 random chars
      const timestamp = Date.now().toString().slice(-5);
      const random = Math.random().toString(36).substring(2, 5).toUpperCase();
      const uniqueCode = `K6-${timestamp}-${random}`;
      const res = http.post(
        `${config.baseUrl}/pricing/tiers`,
        JSON.stringify({
          name: "K6 Test Tier",
          code: uniqueCode,
          description: "Created by k6 performance test",
          isDefault: false,
        }),
        { headers },
      );
      check(res, {
        "create tier status is 200 or 201": (r) =>
          r.status === 200 || r.status === 201,
      });
      if (res.status === 200 || res.status === 201) {
        createdTierId = res.json().data?.id;
      }
      thinkTime();
    });

    // Update price tier
    if (createdTierId) {
      group("PUT /pricing/tiers/:id", () => {
        const res = http.put(
          `${config.baseUrl}/pricing/tiers/${createdTierId}`,
          JSON.stringify({ description: "Updated by k6" }),
          { headers },
        );
        check(res, {
          "update tier status is 200": (r) => r.status === 200,
        });
        thinkTime();
      });
    }

    // Get price quote
    if (productId && getOutletId()) {
      group("GET /pricing/quote", () => {
        const res = http.get(
          `${config.baseUrl}/pricing/quote?productId=${productId}&outletId=${getOutletId()}`,
          { headers },
        );
        check(res, {
          "price quote status is 200": (r) => r.status === 200,
          "price quote returns price": (r) =>
            r.json().data?.effectivePrice !== undefined,
        });
        thinkTime();
      });
    }

    // Get product prices
    if (productId) {
      group("GET /pricing/products/:productId/prices", () => {
        const res = http.get(
          `${config.baseUrl}/pricing/products/${productId}/prices`,
          { headers },
        );
        check(res, {
          "product prices status is 200": (r) => r.status === 200,
        });
        thinkTime();
      });

      // Set product price
      if (createdTierId) {
        group("POST /pricing/products/:productId/prices", () => {
          const res = http.post(
            `${config.baseUrl}/pricing/products/${productId}/prices`,
            JSON.stringify({
              priceTierId: createdTierId,
              outletId: null,
              price: 9500,
            }),
            { headers },
          );
          check(res, {
            "set product price responds": (r) =>
              r.status === 200 || r.status === 201 || r.status === 400,
          });
          thinkTime();
        });
      }
    }
  });
}

export default pricingTests;
