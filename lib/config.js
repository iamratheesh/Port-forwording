/**
 * Configuration and Utilities
 *
 * Central place for app configuration and reusable utility functions
 */

// Environment Configuration
export const config = {
  // Server
  port: process.env.PORT || 3000,
  environment: process.env.NODE_ENV || "development",
  apiUrl: process.env.NEXTAUTH_URL || "http://localhost:3000",

  // Database
  mongodb: {
    uri: process.env.MONGODB_URI,
    dbName: "webhook-forwarder",
    collections: {
      webhooks: "webhooks",
      logs: "webhook_logs",
    },
  },

  // API
  api: {
    maxBodySize: "10mb",
    timeout: 30000, // 30 seconds
    retries: 3,
    retryDelay: 1000, // 1 second
  },

  // Webhooks
  webhook: {
    maxPortNumber: 65535,
    minPortNumber: 1,
    logRetention: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxLogs: 1000, // Max logs to keep per webhook
  },

  // Security
  security: {
    corsOrigins: process.env.CORS_ORIGINS?.split(",") || ["*"],
    apiKey: process.env.API_KEY,
    hashAlgorithm: "sha256",
  },
};

// Utility Functions
export const utils = {
  /**
   * Generate a unique webhook ID
   */
  generateWebhookId: () => {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  },

  /**
   * Generate a unique request ID for tracking
   */
  generateRequestId: () => {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Validate port number
   */
  isValidPort: (port) => {
    const p = parseInt(port);
    return (
      p >= config.webhook.minPortNumber && p <= config.webhook.maxPortNumber
    );
  },

  /**
   * Clean sensitive data from logs
   */
  sanitizeData: (data) => {
    if (!data) return data;

    const sensitiveKeys = [
      "password",
      "token",
      "secret",
      "api_key",
      "authorization",
      "x-api-key",
      "credit_card",
    ];

    const sanitized = JSON.parse(JSON.stringify(data));

    const sanitizeObject = (obj) => {
      if (typeof obj !== "object" || obj === null) return;

      for (const key in obj) {
        if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
          obj[key] = "[REDACTED]";
        } else if (typeof obj[key] === "object") {
          sanitizeObject(obj[key]);
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  },

  /**
   * Retry async function with exponential backoff
   */
  retryAsync: async (fn, options = {}) => {
    const maxRetries = options.maxRetries || config.api.retries;
    const delay = options.delay || config.api.timeout;
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          const waitTime = delay * Math.pow(2, i);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError;
  },

  /**
   * Sleep/delay function
   */
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

  /**
   * Format bytes to human readable
   */
  formatBytes: (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  },

  /**
   * Parse URL and validate
   */
  parseUrl: (urlString) => {
    try {
      const url = new URL(urlString);
      return {
        valid: true,
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        pathname: url.pathname,
        query: url.search,
        full: urlString,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  },

  /**
   * Format timestamp
   */
  formatTimestamp: (date = new Date()) => {
    return date.toISOString();
  },

  /**
   * Get HTTP status description
   */
  getStatusDescription: (statusCode) => {
    const descriptions = {
      200: "OK",
      201: "Created",
      204: "No Content",
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      500: "Internal Server Error",
      502: "Bad Gateway",
      503: "Service Unavailable",
      504: "Gateway Timeout",
    };
    return descriptions[statusCode] || "Unknown";
  },

  /**
   * Check if status code indicates success
   */
  isSuccessStatus: (statusCode) => {
    return statusCode >= 200 && statusCode < 300;
  },

  /**
   * Check if status code indicates client error
   */
  isClientError: (statusCode) => {
    return statusCode >= 400 && statusCode < 500;
  },

  /**
   * Check if status code indicates server error
   */
  isServerError: (statusCode) => {
    return statusCode >= 500;
  },

  /**
   * Clone object deeply
   */
  deepClone: (obj) => {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Merge objects
   */
  merge: (obj1, obj2) => {
    return { ...obj1, ...obj2 };
  },

  /**
   * Get headers to forward (exclude sensitive ones)
   */
  getHeadersToForward: (headers) => {
    const excluded = [
      "host",
      "connection",
      "content-length",
      "transfer-encoding",
      "x-forwarded-for",
      "x-forwarded-proto",
      "x-forwarded-host",
    ];

    const filtered = {};
    for (const [key, value] of Object.entries(headers)) {
      if (!excluded.includes(key.toLowerCase())) {
        filtered[key] = value;
      }
    }
    return filtered;
  },
};

// API Response Helpers
export const response = {
  /**
   * Success response
   */
  success: (data, statusCode = 200) => ({
    statusCode,
    body: {
      success: true,
      data,
      timestamp: utils.formatTimestamp(),
    },
  }),

  /**
   * Error response
   */
  error: (message, statusCode = 400, details = null) => ({
    statusCode,
    body: {
      success: false,
      error: message,
      details,
      timestamp: utils.formatTimestamp(),
    },
  }),

  /**
   * Validation error response
   */
  validationError: (errors) => ({
    statusCode: 400,
    body: {
      success: false,
      error: "Validation failed",
      validationErrors: errors,
      timestamp: utils.formatTimestamp(),
    },
  }),

  /**
   * Unauthorized response
   */
  unauthorized: () => ({
    statusCode: 401,
    body: {
      success: false,
      error: "Unauthorized",
      timestamp: utils.formatTimestamp(),
    },
  }),

  /**
   * Not found response
   */
  notFound: (resource) => ({
    statusCode: 404,
    body: {
      success: false,
      error: `${resource} not found`,
      timestamp: utils.formatTimestamp(),
    },
  }),

  /**
   * Rate limit response
   */
  rateLimited: () => ({
    statusCode: 429,
    body: {
      success: false,
      error: "Too many requests",
      timestamp: utils.formatTimestamp(),
    },
  }),

  /**
   * Server error response
   */
  serverError: (message = "Internal server error", error = null) => ({
    statusCode: 500,
    body: {
      success: false,
      error: message,
      details:
        process.env.NODE_ENV === "development" ? error?.message : undefined,
      timestamp: utils.formatTimestamp(),
    },
  }),
};

// Validation Helpers
export const validation = {
  /**
   * Validate webhook creation data
   */
  validateWebhookCreation: (data) => {
    const errors = {};

    if (!data.localhostPort) {
      errors.localhostPort = "Port is required";
    } else if (!utils.isValidPort(data.localhostPort)) {
      errors.localhostPort = "Port must be between 1 and 65535";
    }

    if (data.description && typeof data.description !== "string") {
      errors.description = "Description must be a string";
    }

    if (data.description && data.description.length > 500) {
      errors.description = "Description cannot exceed 500 characters";
    }

    return Object.keys(errors).length === 0
      ? { valid: true }
      : { valid: false, errors };
  },

  /**
   * Validate webhook ID format
   */
  validateWebhookId: (webhookId) => {
    return /^[a-zA-Z0-9]{30,}$/.test(webhookId);
  },

  /**
   * Validate request headers
   */
  validateHeaders: (headers) => {
    if (!headers || typeof headers !== "object") {
      return { valid: false, error: "Headers must be an object" };
    }
    return { valid: true };
  },

  /**
   * Validate request body
   */
  validateBody: (body) => {
    // Allow any JSON-serializable content
    try {
      JSON.stringify(body);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: "Body must be JSON-serializable" };
    }
  },
};

// Database Helpers
export const db = {
  /**
   * Get webhook with safe projection
   */
  safeWebhookProjection: {
    webhookId: 1,
    localhostPort: 1,
    forwardingUrl: 1,
    description: 1,
    createdAt: 1,
    lastTriggered: 1,
    triggerCount: 1,
    isActive: 1,
  },

  /**
   * Get safe log projection (exclude sensitive data)
   */
  safeLogProjection: {
    timestamp: 1,
    method: 1,
    statusCode: 1,
    forwardedTo: 1,
    // Note: headers and body should be sanitized
  },
};

// Environment Validation
export const validateEnvironment = () => {
  const required = ["MONGODB_URI"];
  const missing = required.filter((env) => !process.env[env]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }

  return true;
};

export default { config, utils, response, validation, db };
