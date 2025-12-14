/**
 * Pino logger configuration
 * Provides structured JSON logging with request IDs
 * Supports optional Loki transport for centralized logging
 */

import pino from "pino";
import config from "../config/index.js";
import { createLokiTransport } from "./lokiTransport.js";

/**
 * Build transport configuration based on environment and settings
 */
function buildTransport() {
  // Development: use pino-pretty for readable console output
  if (config.nodeEnv !== "production") {
    return {
      target: "pino-pretty",
      options: {
        singleLine: true,
        colorize: true,
        translateTime: "yyyy-mm-dd HH:MM:ss.l o",
        ignore: "pid,hostname",
      },
    };
  }

  // Production: use stdout
  return {
    target: "pino/file",
    options: {
      destination: 1, // stdout
    },
    sync: false,
  };
}

/**
 * Create logger with optional Loki destination
 */
function createLoggerInstance() {
  const loggerOptions = {
    level:
      config.logging?.level ||
      (config.nodeEnv === "production" ? "info" : "debug"),
    redact: {
      paths:
        config.nodeEnv === "production"
          ? config.logging?.redactPaths || []
          : [],
      censor: "[REDACTED]",
    },
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        headers: {
          host: req.headers?.host,
          "user-agent": req.headers?.["user-agent"],
        },
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
      err: pino.stdSerializers.err,
    },
  };

  // Add transport for console/file output
  loggerOptions.transport = buildTransport();

  const logger = pino(loggerOptions);

  // Add Loki destination if enabled
  if (config.loki?.enabled) {
    const lokiDest = createLokiTransport("pos-backend");

    // Wrap the original logger to also write to Loki
    const originalWrite = logger[pino.symbols.streamSym];
    const originalInfo = logger.info.bind(logger);
    const originalError = logger.error.bind(logger);
    const originalWarn = logger.warn.bind(logger);
    const originalDebug = logger.debug.bind(logger);

    // Override log methods to also send to Loki
    const wrapMethod = (method, level) => {
      return function (...args) {
        const result = method(...args);

        // Build log object for Loki
        const logObj = {
          time: Date.now(),
          level,
          ...(typeof args[0] === "object" ? args[0] : { msg: args[0] }),
          msg: typeof args[0] === "string" ? args[0] : args[1] || "",
        };
        lokiDest.write(JSON.stringify(logObj));

        return result;
      };
    };

    logger.info = wrapMethod(originalInfo, "info");
    logger.error = wrapMethod(originalError, "error");
    logger.warn = wrapMethod(originalWarn, "warn");
    logger.debug = wrapMethod(originalDebug, "debug");

    logger.info("Loki logging enabled");
  }

  return logger;
}

const logger = createLoggerInstance();

/**
 * Create a child logger with additional context
 * @param {Object} bindings - Additional fields to bind to logger
 * @returns {Object} Child logger instance
 */
export function createLogger(bindings) {
  return logger.child(bindings);
}

export default logger;
