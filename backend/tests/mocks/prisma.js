import { createMockFn } from "./mockFn.js";

// Creates a Prisma client stub with lazy mock functions for any accessed model/method
export function createPrismaMock() {
  const client = {};

  const proxy = new Proxy(client, {
    get(target, prop) {
      if (prop in target) {
        return target[prop];
      }

      // Create a model proxy on first access
      const modelProxy = new Proxy(
        {},
        {
          get(modelTarget, method) {
            if (!(method in modelTarget)) {
              modelTarget[method] = createMockFn();
            }
            return modelTarget[method];
          },
        },
      );

      target[prop] = modelProxy;
      return modelProxy;
    },
  });

  client.$queryRaw = createMockFn();
  client.$queryRawUnsafe = createMockFn();
  client.$on = createMockFn();
  client.$transaction = createMockFn(async (callback) => callback(proxy));

  return proxy;
}
