/**
 * Main Application Entry Point
 * Agentic Workflow Server with full observability
 */

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config, isDevelopment } from './config';
import { logger, requestLogging } from './lib/logger';
import { errorHandler, AppError, ErrorSeverity, ErrorCategory } from './lib/error-handler';
import { metricsCollector } from './lib/metrics';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

// Import OpenTelemetry setup
import './observability/instrumentation';

// Import routes
import { healthRouter } from './features/health/routes';
import { usersRouter } from './features/users/routes';

/**
 * Initialize Express application
 */
function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: isDevelopment ? false : undefined,
    crossOriginEmbedderPolicy: false
  }));

  // CORS configuration
  app.use(cors({
    origin: config.security.corsOrigin,
    credentials: true
  }));

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging middleware
  app.use(requestLogging());

  // Metrics middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Track request
    metricsCollector.increment('http.requests.active');

    // Capture response
    res.on('finish', () => {
      const duration = Date.now() - startTime;

      metricsCollector.recordHttpRequest(
        req.method,
        req.path,
        res.statusCode,
        duration
      );

      metricsCollector.increment('http.requests.active', {}, -1);
    });

    next();
  });

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === config.monitoring.healthCheckPath;
    }
  });

  app.use(limiter);

  // API routes
  app.use('/health', healthRouter);
  app.use('/api/users', usersRouter);

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: config.app.name,
      version: config.app.version,
      environment: config.app.env,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      endpoints: {
        health: '/health',
        metrics: '/metrics',
        users: '/api/users'
      }
    });
  });

  // 404 handler
  app.use((req: Request, res: Response, next: NextFunction) => {
    const error = new AppError({
      message: `Route not found: ${req.method} ${req.path}`,
      severity: ErrorSeverity.LOW,
      category: ErrorCategory.VALIDATION,
      code: 'ROUTE_NOT_FOUND',
      recoverable: false
    });

    next(error);
  });

  // Global error handler
  app.use(async (err: Error, req: Request, res: Response, next: NextFunction) => {
    // Handle error
    await errorHandler.handle(err);

    // Get current span
    const span = trace.getActiveSpan();
    if (span) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err.message
      });
    }

    // Determine status code
    let statusCode = 500;
    let errorResponse: any = {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    };

    if (err instanceof AppError) {
      // Map error category to status code
      switch (err.category) {
        case ErrorCategory.VALIDATION:
          statusCode = 400;
          break;
        case ErrorCategory.AUTHENTICATION:
          statusCode = 401;
          break;
        case ErrorCategory.AUTHORIZATION:
          statusCode = 403;
          break;
        case ErrorCategory.BUSINESS_LOGIC:
          statusCode = 400;
          break;
        default:
          statusCode = 500;
      }

      errorResponse = {
        error: err.code,
        message: err.message,
        severity: err.severity,
        ...(isDevelopment && {
          errorId: err.id,
          suggestedFix: err.suggestedFix,
          context: err.context,
          stack: err.stack
        })
      };
    } else if (isDevelopment) {
      errorResponse = {
        error: err.name,
        message: err.message,
        stack: err.stack
      };
    }

    res.status(statusCode).json(errorResponse);
  });

  return app;
}

/**
 * Start the server
 */
async function startServer() {
  try {
    const app = createApp();

    // Start listening
    const server = app.listen(config.app.port, config.app.host, () => {
      logger.info('Server started successfully', {
        name: config.app.name,
        version: config.app.version,
        environment: config.app.env,
        host: config.app.host,
        port: config.app.port,
        url: `http://${config.app.host}:${config.app.port}`
      });

      // Record startup metric
      metricsCollector.gauge('app.uptime', process.uptime());
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);

      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Flush logs and metrics
          await logger.flush();
          await metricsCollector.flush();

          logger.info('Graceful shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', {
            error: error instanceof Error ? error.message : String(error)
          });
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', async (error: Error) => {
      logger.fatal('Uncaught exception', {
        error: error.message,
        stack: error.stack
      });

      await errorHandler.handle(new AppError({
        message: `Uncaught exception: ${error.message}`,
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.SYSTEM,
        code: 'UNCAUGHT_EXCEPTION',
        recoverable: false,
        cause: error
      }));

      process.exit(1);
    });

    process.on('unhandledRejection', async (reason: any) => {
      logger.fatal('Unhandled rejection', {
        reason: reason instanceof Error ? reason.message : String(reason)
      });

      await errorHandler.handle(new AppError({
        message: `Unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}`,
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.SYSTEM,
        code: 'UNHANDLED_REJECTION',
        recoverable: false
      }));

      process.exit(1);
    });

  } catch (error) {
    logger.fatal('Failed to start server', {
      error: error instanceof Error ? error.message : String(error)
    });

    process.exit(1);
  }
}

// Start the server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

// Export for testing
export { createApp, startServer };