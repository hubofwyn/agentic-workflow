/**
 * Swift Development Monitoring API
 * Tracks Swift/Xcode builds, tests, and app performance
 */

import { Router, Request, Response, NextFunction } from 'express';
import { trace } from '@opentelemetry/api';
import { logger } from '../../lib/logger';
import { metricsCollector } from '../../lib/metrics';
import { AppError, ErrorSeverity, ErrorCategory } from '../../lib/error-handler';
import { SwiftMonitorService } from './service';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

export const swiftRouter = Router();

const tracer = trace.getTracer('swift-monitor');
const monitorService = new SwiftMonitorService();

/**
 * Get current build status
 */
swiftRouter.get('/build/status', async (req: Request, res: Response, next: NextFunction) => {
  const span = tracer.startSpan('swift.build.status');

  try {
    const status = await monitorService.getBuildStatus();

    metricsCollector.increment('swift.api.requests', {
      endpoint: 'build_status'
    });

    res.json(status);
  } catch (error) {
    next(error);
  } finally {
    span.end();
  }
});

/**
 * Trigger a build
 */
swiftRouter.post('/build', async (req: Request, res: Response, next: NextFunction) => {
  const span = tracer.startSpan('swift.build.trigger');

  try {
    const { configuration = 'Debug', clean = false } = req.body;

    logger.info('Triggering Swift build', { configuration, clean });

    const buildId = await monitorService.startBuild({
      configuration,
      clean
    });

    metricsCollector.increment('swift.builds.triggered');

    res.json({
      buildId,
      status: 'started',
      configuration,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  } finally {
    span.end();
  }
});

/**
 * Get test results
 */
swiftRouter.get('/tests/latest', async (req: Request, res: Response, next: NextFunction) => {
  const span = tracer.startSpan('swift.tests.latest');

  try {
    const results = await monitorService.getLatestTestResults();

    metricsCollector.gauge('swift.tests.coverage', results.coverage);
    metricsCollector.gauge('swift.tests.pass_rate',
      (results.passed / results.total) * 100
    );

    res.json(results);
  } catch (error) {
    next(error);
  } finally {
    span.end();
  }
});

/**
 * Run tests
 */
swiftRouter.post('/tests/run', async (req: Request, res: Response, next: NextFunction) => {
  const span = tracer.startSpan('swift.tests.run');

  try {
    const { target = 'FilePilotTests' } = req.body;

    logger.info('Running Swift tests', { target });

    const testRunId = await monitorService.runTests(target);

    metricsCollector.increment('swift.tests.runs');

    res.json({
      testRunId,
      status: 'running',
      target,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  } finally {
    span.end();
  }
});

/**
 * Get code metrics
 */
swiftRouter.get('/metrics', async (req: Request, res: Response, next: NextFunction) => {
  const span = tracer.startSpan('swift.metrics');

  try {
    const metrics = await monitorService.getCodeMetrics();

    // Record metrics for monitoring
    metricsCollector.gauge('swift.code.files', metrics.files);
    metricsCollector.gauge('swift.code.lines', metrics.lines);
    metricsCollector.gauge('swift.code.complexity', metrics.complexity.average);

    res.json(metrics);
  } catch (error) {
    next(error);
  } finally {
    span.end();
  }
});

/**
 * Receive telemetry from Swift app
 */
swiftRouter.post('/telemetry', async (req: Request, res: Response, next: NextFunction) => {
  const span = tracer.startSpan('swift.telemetry');

  try {
    const { event, timestamp, metadata } = req.body;

    // Log telemetry
    logger.info('Swift app telemetry', {
      event,
      timestamp,
      ...metadata
    });

    // Record metrics based on event type
    switch (event) {
      case 'app_launch':
        metricsCollector.increment('swift.app.launches');
        break;
      case 'user_action':
        metricsCollector.increment('swift.app.actions', {
          action: metadata.action
        });
        break;
      case 'navigation':
        metricsCollector.increment('swift.app.navigations');
        break;
      case 'error':
        metricsCollector.increment('swift.app.errors', {
          context: metadata.context
        });
        break;
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  } finally {
    span.end();
  }
});

/**
 * Get Swift/Xcode logs
 */
swiftRouter.get('/logs', async (req: Request, res: Response, next: NextFunction) => {
  const span = tracer.startSpan('swift.logs');

  try {
    const { lines = 100, filter } = req.query;

    const logs = await monitorService.getLogs({
      lines: Number(lines),
      filter: filter as string
    });

    res.json({ logs });
  } catch (error) {
    next(error);
  } finally {
    span.end();
  }
});

/**
 * Analyze Swift code
 */
swiftRouter.post('/analyze', async (req: Request, res: Response, next: NextFunction) => {
  const span = tracer.startSpan('swift.analyze');

  try {
    const { filePath } = req.body;

    if (!filePath) {
      throw new AppError({
        message: 'File path is required',
        severity: ErrorSeverity.LOW,
        category: ErrorCategory.VALIDATION,
        code: 'MISSING_FILE_PATH',
        recoverable: false
      });
    }

    logger.info('Analyzing Swift file', { filePath });

    const analysis = await monitorService.analyzeFile(filePath);

    metricsCollector.increment('swift.analyses.performed');

    res.json(analysis);
  } catch (error) {
    next(error);
  } finally {
    span.end();
  }
});

/**
 * Get file change events
 */
swiftRouter.get('/files/changes', async (req: Request, res: Response, next: NextFunction) => {
  const span = tracer.startSpan('swift.files.changes');

  try {
    const changes = await monitorService.getFileChanges();

    res.json({
      changes,
      count: changes.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  } finally {
    span.end();
  }
});

/**
 * Health check for Swift development environment
 */
swiftRouter.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  const span = tracer.startSpan('swift.health');

  try {
    const health = await monitorService.checkHealth();

    const isHealthy = Object.values(health).every(check => check === true);

    res.status(isHealthy ? 200 : 503).json({
      healthy: isHealthy,
      checks: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  } finally {
    span.end();
  }
});