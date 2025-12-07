import "../testSetup.js";
import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { createLoggerMock } from "../mocks/logger.js";

const loggerMock = createLoggerMock();
mock.module("../../src/libs/logger.js", () => ({ default: loggerMock }));

const config = (await import("../../src/config/index.js")).default;
const baseLogging = { ...config.logging };
const { withRequestLogger, requestLogger } =
  await import("../../src/libs/requestLogger.js");

function createAppHarness() {
  const callbacks = { before: [], after: [] };
  const app = {
    onBeforeHandle(cb) {
      callbacks.before.push(cb);
      return this;
    },
    onAfterHandle(cb) {
      callbacks.after.push(cb);
      return this;
    },
  };
  withRequestLogger()(app);
  return callbacks;
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("libs/requestLogger", () => {
  beforeEach(() => {
    loggerMock.info.mockReset();
    loggerMock.warn.mockReset();
    loggerMock.error.mockReset();
    loggerMock.debug.mockReset();
    config.logging.logFullHeaders = false;
    config.logging.logRequestBody = false;
    config.logging.logResponseBody = false;
  });

  afterAll(() => {
    config.logging.logFullHeaders = baseLogging.logFullHeaders;
    config.logging.logRequestBody = baseLogging.logRequestBody;
    config.logging.logResponseBody = baseLogging.logResponseBody;
  });

  it("assigns request id and logs request/response with headers/body when enabled", async () => {
    config.logging.logFullHeaders = true;
    config.logging.logRequestBody = true;
    config.logging.logResponseBody = true;

    const callbacks = createAppHarness();
    const store = {};
    const request = new Request("http://localhost/test", {
      method: "POST",
      body: JSON.stringify({ hello: "world" }),
      headers: { "content-type": "application/json" },
    });

    await callbacks.before[0]({ request, store });

    const set = {};
    const response = { ok: true };
    await callbacks.after[0]({
      request,
      body: { hello: "world" },
      response,
      set,
      store,
    });
    await flush();

    expect(store.requestId).toBeDefined();
    expect(set.headers["x-request-id"]).toBe(store.requestId);
    const log = loggerMock.info.calls[0][0];
    expect(log.requestHeaders["content-type"]).toContain("application/json");
    expect(log.requestBody).toEqual({ hello: "world" });
    expect(log.responseBody).toEqual(response);
    expect(log.responseHeaders["x-request-id"]).toBe(store.requestId);
  });

  it("uses warn/error levels based on status codes", async () => {
    const callbacks = createAppHarness();
    const request = new Request("http://localhost/test", { method: "GET" });
    const store = {};
    await callbacks.before[0]({ request, store });

    await callbacks.after[0]({
      request,
      body: null,
      response: "fail",
      set: { status: 404 },
      store,
    });
    await flush();
    expect(loggerMock.warn.calls.length).toBe(1);

    await callbacks.after[0]({
      request,
      body: null,
      response: "boom",
      set: { status: 500 },
      store,
    });
    await flush();
    expect(loggerMock.error.calls.length).toBe(1);
  });

  it("formats multipart bodies when logging request body", async () => {
    config.logging.logRequestBody = true;
    const callbacks = createAppHarness();
    const store = {};
    const request = new Request("http://localhost/upload", {
      method: "POST",
      body: "filedata",
      headers: { "content-type": "multipart/form-data; boundary=----1234" },
    });
    await callbacks.before[0]({ request, store });
    await callbacks.after[0]({
      request,
      body: "filedata",
      response: null,
      set: {},
      store,
    });
    await flush();
    const log = loggerMock.info.calls[0][0];
    expect(log.requestBody).toBe("[FORM DATA]");
  });

  it("logs limited headers when full headers disabled", async () => {
    const callbacks = createAppHarness();
    const store = {};
    const request = new Request("http://localhost/test", {
      method: "GET",
      headers: { "x-outlet-id": "out-1", "x-request-id": "abc" },
    });
    await callbacks.before[0]({ request, store });
    const set = {};
    await callbacks.after[0]({
      request,
      body: null,
      response: null,
      set,
      store,
    });
    await flush();
    const log = loggerMock.info.calls[0][0];
    expect(log.headers["x-outlet-id"]).toBe("out-1");
    expect(log.headers["x-request-id"]).toBe(store.requestId);
  });

  it("omits requestBody when body is missing even if logging enabled", async () => {
    config.logging.logRequestBody = true;
    const callbacks = createAppHarness();
    const store = {};
    const request = new Request("http://localhost/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    await callbacks.before[0]({ request, store });
    await callbacks.after[0]({
      request,
      body: undefined,
      response: "ok",
      set: {},
      store,
    });
    await flush();
    const log = loggerMock.info.calls[0][0];
    expect(log.requestBody).toBeUndefined();
  });

  it("logs response body as string when not an object", async () => {
    config.logging.logResponseBody = true;
    const callbacks = createAppHarness();
    const store = {};
    const request = new Request("http://localhost/test", { method: "POST" });
    await callbacks.before[0]({ request, store });
    await callbacks.after[0]({
      request,
      body: null,
      response: "plain-text",
      set: {},
      store,
    });
    await flush();
    const log = loggerMock.info.calls[0][0];
    expect(log.responseBody).toBe("plain-text");
  });

  it("legacy requestLogger logs info with request id", async () => {
    const store = {};
    const set = {};
    const request = new Request("http://localhost/legacy", { method: "GET" });
    await requestLogger({ request, set, store });
    await flush();
    expect(store.requestId).toBeDefined();
    expect(loggerMock.info.calls.length).toBe(1);
  });
});
