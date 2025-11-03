/**
 * Health Check Routes
 * Provides health and readiness endpoints for monitoring
 */

import { Router, Request, Response } from 'express';
import { logger } from '../../lib/logger';
import { metricsCollector } from '../../lib/metrics';
import { config } from '../../config';

export const healthRouter = Router();

/**
 * Health check endpoint
 * Returns basic health status
 */
healthRouter.get('/', async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.app.env,
    version: config.app.version
  };

  logger.debug('Health check requested', health);
  metricsCollector.increment('health.checks.total', { status: 'success' });

  res.json(health);
});

/**
 * Readiness check endpoint
 * Checks if the application is ready to serve requests
 */
healthRouter.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check critical dependencies
    const checks = {
      server: true,
      memory: checkMemory(),
      uptime: process.uptime() > 5 // At least 5 seconds uptime
    };

    const isReady = Object.values(checks).every(check => check === true);

    const readiness = {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks
    };

    logger.debug('Readiness check requested', readiness);
    metricsCollector.increment('health.readiness.total', {
      status: isReady ? 'ready' : 'not_ready'
    });

    res.status(isReady ? 200 : 503).json(readiness);
  } catch (error) {
    logger.error('Readiness check failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Liveness check endpoint
 * Checks if the application is alive
 */
healthRouter.get('/live', async (req: Request, res: Response) => {
  const liveness = {
    status: 'alive',
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptime: process.uptime()
  };

  logger.debug('Liveness check requested', liveness);
  metricsCollector.increment('health.liveness.total', { status: 'alive' });

  res.json(liveness);
});

/**
 * Detailed health metrics endpoint
 */
healthRouter.get('/metrics', async (req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: formatBytes(memUsage.rss),
      heapTotal: formatBytes(memUsage.heapTotal),
      heapUsed: formatBytes(memUsage.heapUsed),
      external: formatBytes(memUsage.external),
      arrayBuffers: formatBytes(memUsage.arrayBuffers)
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    process: {
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };

  // Record memory metrics
  metricsCollector.gauge('process.memory.rss', memUsage.rss);
  metricsCollector.gauge('process.memory.heap.used', memUsage.heapUsed);
  metricsCollector.gauge('process.memory.heap.total', memUsage.heapTotal);

  res.json(metrics);
});

/**
 * Check if memory usage is within acceptable limits
 */
function checkMemory(): boolean {
  const memUsage = process.memoryUsage();
  const heapUsedPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

  // Alert if heap usage > 90%
  return heapUsedPercentage < 90;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = (bytes / Math.pow(1024, i)).toFixed(2);

  return `${value} ${sizes[i]}`;
}