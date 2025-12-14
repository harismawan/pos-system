// HTTP request utilities for k6 tests
import http from "k6/http";
import { check, sleep } from "k6";
import config from "../config.js";

/**
 * Make a GET request with standard checks
 */
export function get(url, headers, checkName = "status is 200") {
  const res = http.get(`${config.baseUrl}${url}`, { headers });
  check(res, { [checkName]: (r) => r.status === 200 });
  return res;
}

/**
 * Make a POST request with standard checks
 */
export function post(
  url,
  body,
  headers,
  expectedStatus = 200,
  checkName = "request successful",
) {
  const res = http.post(`${config.baseUrl}${url}`, JSON.stringify(body), {
    headers,
  });
  check(res, { [checkName]: (r) => r.status === expectedStatus });
  return res;
}

/**
 * Make a PUT request with standard checks
 */
export function put(url, body, headers, checkName = "update successful") {
  const res = http.put(`${config.baseUrl}${url}`, JSON.stringify(body), {
    headers,
  });
  check(res, { [checkName]: (r) => r.status === 200 });
  return res;
}

/**
 * Make a DELETE request with standard checks
 */
export function del(url, headers, checkName = "delete successful") {
  const res = http.del(`${config.baseUrl}${url}`, null, { headers });
  check(res, { [checkName]: (r) => r.status === 200 });
  return res;
}

/**
 * Random think time between requests (100-500ms)
 */
export function thinkTime() {
  sleep(Math.random() * 0.4 + 0.1);
}

/**
 * Generate a unique identifier for test data
 */
export function uniqueId() {
  return `k6-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
