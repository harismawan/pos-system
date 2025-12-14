/**
 * Loki Transport for Pino
 * Ships logs to Grafana Loki for centralized logging
 */

import config from "../config/index.js";

/**
 * Loki transport class
 * Batches log entries and sends them to Loki
 */
class LokiTransport {
  constructor(options = {}) {
    this.url = options.url || config.loki.url;
    this.batchSize = options.batchSize || config.loki.batchSize;
    this.batchInterval = options.batchInterval || config.loki.batchInterval;
    this.labels = options.labels || {};
    this.batch = [];
    this.timer = null;

    // Start batch timer
    this.startTimer();
  }

  /**
   * Start the batch flush timer
   */
  startTimer() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => this.flush(), this.batchInterval);
  }

  /**
   * Stop the batch flush timer
   */
  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Add a log entry to the batch
   */
  push(logEntry) {
    const timestamp = logEntry.time
      ? new Date(logEntry.time).getTime() * 1000000 // Convert to nanoseconds
      : Date.now() * 1000000;

    // Determine level label
    const level = logEntry.level || "info";

    // Create labels for this entry
    const labels = {
      ...this.labels,
      level: this.mapLevel(level),
    };

    // Format as Loki expects
    const entry = {
      labels,
      entries: [
        {
          ts: timestamp,
          line: JSON.stringify(logEntry),
        },
      ],
    };

    this.batch.push(entry);

    // Flush if batch is full
    if (this.batch.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Map Pino log levels to string labels
   */
  mapLevel(level) {
    const levelMap = {
      10: "trace",
      20: "debug",
      30: "info",
      40: "warn",
      50: "error",
      60: "fatal",
    };
    return typeof level === "number" ? levelMap[level] || "info" : level;
  }

  /**
   * Flush the batch to Loki
   */
  async flush() {
    if (this.batch.length === 0) {
      return;
    }

    const entries = this.batch;
    this.batch = [];

    // Group entries by labels
    const streams = this.groupByLabels(entries);

    const payload = { streams };

    try {
      const response = await fetch(`${this.url}/loki/api/v1/push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(
          `Loki push failed: ${response.status} ${response.statusText}`,
        );
        // Re-add failed entries to batch for retry (up to a limit)
        if (this.batch.length < this.batchSize * 2) {
          this.batch.unshift(...entries);
        }
      }
    } catch (err) {
      console.error(`Loki push error: ${err.message}`);
      // Re-add failed entries to batch for retry (up to a limit)
      if (this.batch.length < this.batchSize * 2) {
        this.batch.unshift(...entries);
      }
    }
  }

  /**
   * Group entries by their labels for efficient Loki push
   */
  groupByLabels(entries) {
    const groups = new Map();

    for (const entry of entries) {
      const labelKey = JSON.stringify(entry.labels);

      if (!groups.has(labelKey)) {
        groups.set(labelKey, {
          stream: entry.labels,
          values: [],
        });
      }

      for (const e of entry.entries) {
        // Loki expects [timestamp_ns_string, line]
        groups.get(labelKey).values.push([e.ts.toString(), e.line]);
      }
    }

    return Array.from(groups.values());
  }

  /**
   * Close the transport and flush remaining logs
   */
  async close() {
    this.stopTimer();
    await this.flush();
  }
}

/**
 * Create a Pino destination that writes to Loki
 */
export function createLokiDestination(options = {}) {
  const transport = new LokiTransport(options);

  // Create a writable-like object for Pino
  return {
    write(data) {
      try {
        const logEntry = typeof data === "string" ? JSON.parse(data) : data;
        transport.push(logEntry);
      } catch (err) {
        console.error("Failed to parse log entry for Loki:", err);
      }
    },
    end() {
      transport.close();
    },
  };
}

/**
 * Create Loki transport with service labels
 */
export function createLokiTransport(serviceName, additionalLabels = {}) {
  return createLokiDestination({
    labels: {
      service: serviceName,
      environment: config.nodeEnv,
      ...additionalLabels,
    },
  });
}

export default {
  LokiTransport,
  createLokiDestination,
  createLokiTransport,
};
