/**
 * Advanced Logging System
 * Structured logging with automatic context propagation and observability
 */

import winston from 'winston';
import { trace, context } from '@opentelemetry/api';
import Transport from 'winston-transport';
import { AsyncLocalStorage } from 'async_hooks';

// Create async local storage for context
const asyncContext = new AsyncLocalStorage<LogContext>();

/**
 * Log context that travels with async operations
 */
export interface LogContext {
  correlationId: string;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  spanId?: string;
  requestId?: string;
  service?: string;
  environment?: string;
  version?: string;
  [key: string]: any;
}

/**
 * Log levels matching severity
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Custom formatter for structured logs
 */
const structuredFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const currentContext = asyncContext.getStore() || {};
  const span = trace.getActiveSpan();

  const logEntry = {
    timestamp,
    level,
    message,
    ...currentContext,
    ...meta,
    trace: span ? {
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
      traceFlags: span.spanContext().traceFlags
    } : undefined
  };

  return JSON.stringify(logEntry);
});

/**
 * OpenTelemetry transport for Winston
 */
class OpenTelemetryTransport extends Transport {
  private tracer = trace.getTracer('logger');

  log(info: any, callback: () => void): void {
    const span = this.tracer.startSpan('log.emit');

    span.setAttributes({
      'log.level': info.level,
      'log.message': info.message,
      'log.timestamp': info.timestamp
    });

    // Add custom attributes
    if (info.correlationId) {
      span.setAttribute('correlation.id', info.correlationId);
    }

    if (info.userId) {
      span.setAttribute('user.id', info.userId);
    }

    // Send to OpenTelemetry
    span.end();

    callback();
  }
}

/**
 * Advanced logger with context propagation
 */
export class Logger {
  private winston: winston.Logger;
  private readonly service: string;
  private static readonly sensitiveFields = new Set([
    'password',
    'token',
    'apiKey',
    'secret',
    'creditCard',
    'ssn',
    'authorization'
  ]);

  constructor(service: string) {
    this.service = service;

    // Create Winston logger
    this.winston = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.metadata(),
        structuredFormat
      ),
      defaultMeta: { service },
      transports: this.createTransports()
    });
  }

  /**
   * Create transports based on environment
   */
  private createTransports(): winston.transport[] {
    const transports: winston.transport[] = [];

    // Console transport for development
    if (process.env.NODE_ENV !== 'production') {
      transports.push(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }

    // File transport for persistence
    transports.push(new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }));

    transports.push(new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }));

    // OpenTelemetry transport
    transports.push(new OpenTelemetryTransport());

    return transports;
  }

  /**
   * Sanitize sensitive data from logs
   */
  private sanitize(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    for (const [key, value] of Object.entries(sanitized)) {
      // Check if field is sensitive
      if (Logger.sensitiveFields.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      }
    }

    return sanitized;
  }

  /**
   * Create child logger with additional context
   */
  public child(context: LogContext): Logger {
    const child = new Logger(this.service);
    child.winston = this.winston.child(context);
    return child;
  }

  /**
   * Run function with logging context
   */
  public withContext<T>(context: LogContext, fn: () => T): T {
    return asyncContext.run(context, fn);
  }

  /**
   * Debug level logging
   */
  public debug(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * Info level logging
   */
  public info(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * Warning level logging
   */
  public warn(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * Error level logging
   */
  public error(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, meta);
  }

  /**
   * Fatal level logging
   */
  public fatal(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, meta);
  }

  /**
   * Generic log method
   */
  private log(level: LogLevel, message: string, meta?: Record<string, any>): void {
    const sanitizedMeta = meta ? this.sanitize(meta) : {};
    const currentContext = asyncContext.getStore() || {};

    // Measure log processing time
    const startTime = Date.now();

    this.winston.log({
      level,
      message,
      ...currentContext,
      ...sanitizedMeta,
      processingTime: Date.now() - startTime
    });
  }

  /**
   * Profile a function execution
   */
  public async profile<T>(
    name: string,
    fn: () => Promise<T>,
    meta?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    const span = trace.getTracer('profiler').startSpan(`profile.${name}`);

    try {
      this.info(`Starting ${name}`, { ...meta, phase: 'start' });

      const result = await fn();

      const duration = Date.now() - startTime;

      this.info(`Completed ${name}`, {
        ...meta,
        phase: 'complete',
        duration,
        success: true
      });

      span.setAttributes({
        'profile.duration': duration,
        'profile.success': true
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.error(`Failed ${name}`, {
        ...meta,
        phase: 'error',
        duration,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });

      span.setAttributes({
        'profile.duration': duration,
        'profile.success': false,
        'profile.error': error instanceof Error ? error.message : String(error)
      });

      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Create structured log for HTTP requests
   */
  public logHttpRequest(req: any, res: any, duration: number): void {
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      query: this.sanitize(req.query),
      body: this.sanitize(req.body)
    };

    if (res.statusCode >= 500) {
      this.error('HTTP request failed', logData);
    } else if (res.statusCode >= 400) {
      this.warn('HTTP request client error', logData);
    } else {
      this.info('HTTP request completed', logData);
    }
  }

  /**
   * Log metrics data
   */
  public metric(name: string, value: number, meta?: Record<string, any>): void {
    this.info('Metric recorded', {
      metric: name,
      value,
      ...meta,
      type: 'metric'
    });
  }

  /**
   * Log audit events
   */
  public audit(action: string, meta?: Record<string, any>): void {
    const currentContext = asyncContext.getStore() || {};

    this.info('Audit event', {
      action,
      ...meta,
      type: 'audit',
      userId: currentContext.userId,
      sessionId: currentContext.sessionId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Flush all transports
   */
  public async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.winston.end(() => resolve());
    });
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger('global');

/**
 * Express middleware for request logging
 */
export function requestLogging() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || generateRequestId();

    // Create context for this request
    const context: LogContext = {
      correlationId: requestId,
      userId: req.user?.id,
      sessionId: req.session?.id,
      requestId,
      method: req.method,
      path: req.path
    };

    // Run the rest of the request in context
    asyncContext.run(context, () => {
      // Log request start
      logger.info('Request started', {
        method: req.method,
        path: req.path,
        query: req.query
      });

      // Override res.end to log response
      const originalEnd = res.end;
      res.end = function(...args: any[]) {
        const duration = Date.now() - startTime;

        logger.logHttpRequest(req, res, duration);

        originalEnd.apply(res, args);
      };

      next();
    });
  };
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}