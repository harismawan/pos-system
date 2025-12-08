import { createMockFn } from "./mockFn.js";

export function createCacheMock() {
  return {
    getCache: createMockFn(async () => null),
    setCache: createMockFn(async () => undefined),
    deleteCache: createMockFn(async () => undefined),
    deleteCachePattern: createMockFn(async () => undefined),
    wrapWithCache: createMockFn(async (key, ttl, fn) => fn()),
    hashObject: createMockFn((obj) => "mock-hash"),
    CACHE_TTL: {
      PRODUCT_DETAIL: 300,
      PRODUCT_LIST: 60,
    },
    CACHE_KEYS: {
      PRODUCT_BY_ID: (id) => `cache:product:${id}`,
      PRODUCTS_LIST: (hash) => `cache:products:list:${hash}`,
    },
  };
}
