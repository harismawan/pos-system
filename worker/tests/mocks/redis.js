import { createMockFn } from "./mockFn.js";

export function createRedisMock() {
  const store = new Map();
  const lists = new Map();

  return {
    ping: createMockFn(async () => "PONG"),

    get: createMockFn(async (key) => {
      const val = store.get(key);
      return val === undefined ? null : val;
    }),

    set: createMockFn(async (key, value) => {
      store.set(key, value);
      return "OK";
    }),

    setex: createMockFn(async (key, ttl, value) => {
      store.set(key, value);
      return "OK";
    }),

    del: createMockFn(async (...keys) => {
      let count = 0;
      for (const key of keys) {
        if (store.delete(key)) count++;
        if (lists.delete(key)) count++;
      }
      return count;
    }),

    exists: createMockFn(async (key) => {
      return store.has(key) || lists.has(key) ? 1 : 0;
    }),

    keys: createMockFn(async (pattern) => {
      // Simple pattern matching: if pattern is "*", return all keys
      // Otherwise just return matching exact keys for now (can expand if needed)
      const allKeys = [...store.keys(), ...lists.keys()];
      if (pattern === "*") return allKeys;

      // Basic glob matching support (very limited)
      if (pattern.endsWith("*")) {
        const prefix = pattern.slice(0, -1);
        return allKeys.filter((k) => k.startsWith(prefix));
      }

      return allKeys.filter((k) => k === pattern);
    }),

    lpush: createMockFn(async (key, ...values) => {
      if (!lists.has(key)) {
        lists.set(key, []);
      }
      const list = lists.get(key);
      // Redis LPUSH prepends, so unshift
      // values are added in order: lpush key a b c -> [c, b, a]
      // simplified: just reverse values and unshift
      // wait, standard redis lpush(key, a, b, c) results in:
      // list: [c, b, a, ...old]

      for (const val of values) {
        list.unshift(val);
      }
      return list.length;
    }),

    brpop: createMockFn(async (key, timeout) => {
      // Mock doesn't support blocking/timeout validation
      // Just check if there is data
      if (!lists.has(key) || lists.get(key).length === 0) {
        return null;
      }
      const list = lists.get(key);
      const val = list.pop(); // RPOP
      return [key, val];
    }),

    llen: createMockFn(async (key) => {
      if (!lists.has(key)) return 0;
      return lists.get(key).length;
    }),

    quit: createMockFn(async () => undefined),

    // Cache tracking methods (wrapper interface)
    recordCacheHit: createMockFn(() => {}),
    recordCacheMiss: createMockFn(() => {}),

    // Helper to inspect store in tests
    _getStore: () => store,
    _getLists: () => lists,
    _clear: () => {
      store.clear();
      lists.clear();
    },
  };
}
