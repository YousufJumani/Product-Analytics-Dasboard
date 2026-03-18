/**
 * Structured JSON Logger using Winston
 *
 * CONCEPT: Structured logging means each log entry is a JSON object with
 * consistent fields (level, message, timestamp, context). This is critical
 * because log aggregation tools (Datadog, Logtail, CloudWatch) can then
 * filter and query logs by field — e.g. "show all ERROR logs from orgId X".
 *
 * WHY WINSTON over console.log:
 *  - Log levels (error/warn/info/debug) let you silence debug noise in prod
 *  - Transports: write to stdout (for Vercel) and optionally to file
 *  - Consistent format means automated alerting is reliable
 */
import winston from "winston";

const { combine, timestamp, json, colorize, simple } = winston.format;

const isDev = process.env.NODE_ENV === "development";

export const logger = winston.createLogger({
  level: isDev ? "debug" : "info",
  format: combine(
    timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }),
    json()
  ),
  defaultMeta: { service: "saas-analytics-copilot" },
  transports: [
    new winston.transports.Console({
      format: isDev ? combine(colorize(), simple()) : combine(timestamp(), json()),
    }),
  ],
});

// Convenience wrappers with typed context
type LogContext = Record<string, unknown>;

export const log = {
  info: (msg: string, ctx?: LogContext) => logger.info(msg, ctx),
  warn: (msg: string, ctx?: LogContext) => logger.warn(msg, ctx),
  error: (msg: string, ctx?: LogContext) => logger.error(msg, ctx),
  debug: (msg: string, ctx?: LogContext) => logger.debug(msg, ctx),
};
