/**
 * Advanced Error Handling System
 * Provides structured error handling with automatic recovery and observability
 */

import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { Logger } from './logger';
import { MetricsCollector } from './metrics';
import { AlertManager } from './alerts';

const tracer = trace.getTracer('error-handler');
const logger = new Logger('ErrorHandler');
const metrics = new MetricsCollector();
const alerts = new AlertManager();

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  DATABASE = 'database',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  EXTERNAL_SERVICE = 'external_service',
  CONFIGURATION = 'configuration'
}

/**
 * Recovery strategies
 */
export enum RecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  CIRCUIT_BREAK = 'circuit_break',
  COMPENSATE = 'compensate',
  IGNORE = 'ignore',
  ESCALATE = 'escalate'
}

/**
 * Base application error with enhanced context
 */
export class AppError extends Error {
  public readonly id: string;
  public readonly timestamp: Date;
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly code: string;
  public readonly context: Record<string, any>;
  public readonly recoverable: boolean;
  public readonly recovery?: RecoveryStrategy;
  public readonly suggestedFix?: string;
  public readonly documentation?: string;
  public readonly correlationId?: string;
  public readonly userId?: string;
  public readonly sessionId?: string;
  public readonly traceId?: string;

  constructor(params: {
    message: string;
    severity: ErrorSeverity;
    category: ErrorCategory;
    code: string;
    context?: Record<string, any>;
    recoverable?: boolean;
    recovery?: RecoveryStrategy;
    suggestedFix?: string;
    documentation?: string;
    cause?: Error;
  }) {
    super(params.message);
    this.name = 'AppError';
    this.id = this.generateErrorId();
    this.timestamp = new Date();
    this.severity = params.severity;
    this.category = params.category;
    this.code = params.code;
    this.context = params.context || {};
    this.recoverable = params.recoverable ?? false;
    this.recovery = params.recovery;
    this.suggestedFix = params.suggestedFix;
    this.documentation = params.documentation;

    // Extract context information
    const currentContext = context.active();
    this.correlationId = currentContext.getValue('correlationId') as string;
    this.userId = currentContext.getValue('userId') as string;
    this.sessionId = currentContext.getValue('sessionId') as string;
    this.traceId = currentContext.getValue('traceId') as string;

    // Set cause if provided
    if (params.cause) {
      this.cause = params.cause;
    }

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      message: this.message,
      severity: this.severity,
      category: this.category,
      code: this.code,
      context: this.context,
      recoverable: this.recoverable,
      recovery: this.recovery,
      suggestedFix: this.suggestedFix,
      documentation: this.documentation,
      timestamp: this.timestamp.toISOString(),
      correlationId: this.correlationId,
      userId: this.userId,
      sessionId: this.sessionId,
      traceId: this.traceId,
      stack: this.stack,
      cause: this.cause
    };
  }
}

/**
 * Error handler with recovery capabilities
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCount = new Map<string, number>();
  private circuitBreakers = new Map<string, CircuitBreaker>();

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle error with automatic recovery
   */
  public async handle(error: AppError | Error): Promise<void> {
    const span = tracer.startSpan('error.handle');

    try {
      // Convert to AppError if needed
      const appError = this.normalizeError(error);

      // Log error
      this.logError(appError);

      // Record metrics
      this.recordMetrics(appError);

      // Check if alerting is needed
      await this.checkAlerts(appError);

      // Attempt recovery if possible
      if (appError.recoverable && appError.recovery) {
        await this.attemptRecovery(appError);
      }

      // Update span with error information
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: appError.message
      });

      span.setAttributes({
        'error.id': appError.id,
        'error.code': appError.code,
        'error.severity': appError.severity,
        'error.category': appError.category,
        'error.recoverable': appError.recoverable
      });

    } catch (handlingError) {
      logger.error('Error in error handler', { error: handlingError });
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: 'Error handler failed'
      });
    } finally {
      span.end();
    }
  }

  /**
   * Normalize any error to AppError
   */
  private normalizeError(error: AppError | Error): AppError {
    if (error instanceof AppError) {
      return error;
    }

    return new AppError({
      message: error.message,
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.SYSTEM,
      code: 'UNKNOWN_ERROR',
      context: {
        originalError: error.name,
        stack: error.stack
      },
      recoverable: false
    });
  }

  /**
   * Log error with appropriate level
   */
  private logError(error: AppError): void {
    const logData = {
      errorId: error.id,
      code: error.code,
      category: error.category,
      context: error.context,
      correlationId: error.correlationId,
      userId: error.userId,
      sessionId: error.sessionId,
      traceId: error.traceId
    };

    switch (error.severity) {
      case ErrorSeverity.LOW:
        logger.debug('Low severity error', logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn('Medium severity error', logData);
        break;
      case ErrorSeverity.HIGH:
        logger.error('High severity error', logData);
        break;
      case ErrorSeverity.CRITICAL:
        logger.fatal('Critical error', logData);
        break;
    }
  }

  /**
   * Record error metrics
   */
  private recordMetrics(error: AppError): void {
    // Increment error counter
    metrics.increment('errors.total', {
      severity: error.severity,
      category: error.category,
      code: error.code,
      recoverable: String(error.recoverable)
    });

    // Track error rate
    const errorKey = `${error.category}:${error.code}`;
    const count = (this.errorCount.get(errorKey) || 0) + 1;
    this.errorCount.set(errorKey, count);

    metrics.gauge('errors.rate', count, {
      category: error.category,
      code: error.code
    });

    // Record error details for analysis
    metrics.histogram('errors.context_size',
      JSON.stringify(error.context).length,
      { category: error.category }
    );
  }

  /**
   * Check if alerting is needed
   */
  private async checkAlerts(error: AppError): Promise<void> {
    // Critical errors always trigger alerts
    if (error.severity === ErrorSeverity.CRITICAL) {
      await alerts.send({
        severity: 'critical',
        title: `Critical Error: ${error.code}`,
        message: error.message,
        context: error.toJSON()
      });
      return;
    }

    // Check error rate for automatic alerting
    const errorKey = `${error.category}:${error.code}`;
    const count = this.errorCount.get(errorKey) || 0;

    if (count > 10) { // Threshold for error rate
      await alerts.send({
        severity: 'warning',
        title: `High Error Rate: ${error.code}`,
        message: `Error ${error.code} has occurred ${count} times`,
        context: {
          errorCode: error.code,
          category: error.category,
          count: count,
          lastError: error.toJSON()
        }
      });
    }
  }

  /**
   * Attempt automatic recovery
   */
  private async attemptRecovery(error: AppError): Promise<void> {
    const span = tracer.startSpan('error.recovery');

    try {
      switch (error.recovery) {
        case RecoveryStrategy.RETRY:
          await this.retryOperation(error);
          break;

        case RecoveryStrategy.FALLBACK:
          await this.fallbackOperation(error);
          break;

        case RecoveryStrategy.CIRCUIT_BREAK:
          await this.circuitBreak(error);
          break;

        case RecoveryStrategy.COMPENSATE:
          await this.compensate(error);
          break;

        case RecoveryStrategy.ESCALATE:
          await this.escalate(error);
          break;

        case RecoveryStrategy.IGNORE:
          logger.info('Ignoring recoverable error', { errorId: error.id });
          break;
      }

      metrics.increment('errors.recovery.success', {
        strategy: error.recovery,
        code: error.code
      });

    } catch (recoveryError) {
      logger.error('Recovery failed', {
        errorId: error.id,
        recovery: error.recovery,
        recoveryError
      });

      metrics.increment('errors.recovery.failure', {
        strategy: error.recovery || 'unknown',
        code: error.code
      });

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: 'Recovery failed'
      });
    } finally {
      span.end();
    }
  }

  private async retryOperation(error: AppError): Promise<void> {
    logger.info('Retrying operation', { errorId: error.id });
    // Implementation would retry the failed operation
  }

  private async fallbackOperation(error: AppError): Promise<void> {
    logger.info('Using fallback', { errorId: error.id });
    // Implementation would use fallback logic
  }

  private async circuitBreak(error: AppError): Promise<void> {
    const key = `${error.category}:${error.code}`;
    let breaker = this.circuitBreakers.get(key);

    if (!breaker) {
      breaker = new CircuitBreaker(key);
      this.circuitBreakers.set(key, breaker);
    }

    breaker.recordFailure();
    logger.info('Circuit breaker activated', {
      errorId: error.id,
      state: breaker.getState()
    });
  }

  private async compensate(error: AppError): Promise<void> {
    logger.info('Running compensation', { errorId: error.id });
    // Implementation would run compensation logic
  }

  private async escalate(error: AppError): Promise<void> {
    logger.info('Escalating error', { errorId: error.id });
    await alerts.send({
      severity: 'high',
      title: `Escalated Error: ${error.code}`,
      message: `Error requires manual intervention: ${error.message}`,
      context: error.toJSON()
    });
  }
}

/**
 * Circuit breaker implementation
 */
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime?: Date;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly name: string,
    private readonly threshold = 5,
    private readonly timeout = 60000 // 1 minute
  ) {}

  public recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.threshold) {
      this.state = 'open';
      metrics.increment('circuit_breaker.opened', { name: this.name });

      // Schedule half-open transition
      setTimeout(() => {
        this.state = 'half-open';
        metrics.increment('circuit_breaker.half_open', { name: this.name });
      }, this.timeout);
    }
  }

  public recordSuccess(): void {
    if (this.state === 'half-open') {
      this.state = 'closed';
      this.failureCount = 0;
      metrics.increment('circuit_breaker.closed', { name: this.name });
    }
  }

  public getState(): string {
    return this.state;
  }

  public isOpen(): boolean {
    return this.state === 'open';
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();