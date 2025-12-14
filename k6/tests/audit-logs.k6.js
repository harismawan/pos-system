// Audit Logs API Performance Tests
import http from "k6/http";
import { check, group } from "k6";
import config from "../config.js";
import { ensureAuthenticated, getAuthHeaders } from "../helpers/auth.js";
import { thinkTime } from "../helpers/http.js";

export function auditLogsTests() {
  ensureAuthenticated();
  const headers = getAuthHeaders();
  let auditLogId = null;

  group("Audit Logs API", () => {
    // List audit logs
    group("GET /audit-logs", () => {
      const res = http.get(`${config.baseUrl}/audit-logs?page=1&limit=20`, {
        headers,
      });
      check(res, {
        "list audit logs status is 200": (r) => r.status === 200,
        "list audit logs returns data": (r) =>
          r.json().data?.logs !== undefined,
      });
      if (res.status === 200) {
        const logs = res.json().data?.logs;
        if (Array.isArray(logs) && logs.length > 0) {
          auditLogId = logs[0].id;
        }
      }
      thinkTime();
    });

    // Get event types
    group("GET /audit-logs/event-types", () => {
      const res = http.get(`${config.baseUrl}/audit-logs/event-types`, {
        headers,
      });
      check(res, {
        "event types status is 200": (r) => r.status === 200,
        "event types returns array": (r) =>
          Array.isArray(r.json().data?.eventTypes),
      });
      thinkTime();
    });

    // Get entity types
    group("GET /audit-logs/entity-types", () => {
      const res = http.get(`${config.baseUrl}/audit-logs/entity-types`, {
        headers,
      });
      check(res, {
        "entity types status is 200": (r) => r.status === 200,
        "entity types returns array": (r) =>
          Array.isArray(r.json().data?.entityTypes),
      });
      thinkTime();
    });

    // Get audit log by ID
    if (auditLogId) {
      group("GET /audit-logs/:id", () => {
        const res = http.get(`${config.baseUrl}/audit-logs/${auditLogId}`, {
          headers,
        });
        check(res, {
          "get audit log status is 200": (r) => r.status === 200,
          "get audit log returns data": (r) => r.json().data?.id === auditLogId,
        });
        thinkTime();
      });
    }
  });
}

export default auditLogsTests;
