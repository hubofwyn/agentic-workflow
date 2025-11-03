/**
 * Metrics Collection Library
 * Provides automatic metrics collection with OpenTelemetry integration
 */

import { metrics, Meter, Counter, Histogram, ObservableGauge } from '@opentelemetry/api';
import { Logger } from './logger';

const logger = new Logger('MetricsCollector');

/**
 * Metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  HISTOGRAM = 'histogram',
  GAUGE = 'gauge'
}

/**
 * Metric configuration
 */
export interface MetricConfig {
  name: string;
  description?: string;
  unit?: string;
  type: MetricType;
  tags?: Record<string, string>;
}

/**
 * Metrics collector with automatic instrumentation
 */
export class MetricsCollector {
  private meter: Meter;
  private counters: Map<string, Counter> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private gauges: Map<string, ObservableGauge> = new Map();
  private gaugeValues: Map<string, number> = new Map();

  constructor(serviceName: string = 'agentic-workflow') {
    this.meter = metrics.getMeter(serviceName);
    this.initializeDefaultMetrics();
  }

  /**
   * Initialize default metrics
   */
  private initializeDefaultMetrics(): void {
    // HTTP metrics
    this.createCounter({
      name: 'http.requests.total',
      description: 'Total number of HTTP requests',
      type: MetricType.COUNTER
    });

    this.createHistogram({
      name: 'http.request.duration',
      description: 'HTTP request duration in milliseconds',
      unit: 'ms',
      type: MetricType.HISTOGRAM
    });

    // Error metrics
    this.createCounter({
      name: 'errors.total',
      description: 'Total number of errors',
      type: MetricType.COUNTER
    });

    // Business metrics
    this.createCounter({
      name: 'operations.total',
      description: 'Total number of operations',
      type: MetricType.COUNTER
    });

    this.createHistogram({
      name: 'operations.duration',
      description: 'Operation duration in milliseconds',
      unit: 'ms',
      type: MetricType.HISTOGRAM
    });

    logger.info('Default metrics initialized');
  }

  /**
   * Create a counter metric
   */
  private createCounter(config: MetricConfig): Counter {
    const counter = this.meter.createCounter(config.name, {
      description: config.description,
      unit: config.unit
    });

    this.counters.set(config.name, counter);
    return counter;
  }

  /**
   * Create a histogram metric
   */
  private createHistogram(config: MetricConfig): Histogram {
    const histogram = this.meter.createHistogram(config.name, {
      description: config.description,
      unit: config.unit
    });

    this.histograms.set(config.name, histogram);
    return histogram;
  }

  /**
   * Create a gauge metric
   */
  private createGauge(config: MetricConfig): ObservableGauge {
    const gaugeName = config.name;

    const gauge = this.meter.createObservableGauge(gaugeName, {
      description: config.description,
      unit: config.unit
    });

    // Set up callback to return current value
    gauge.addCallback((observableResult) => {
      const value = this.gaugeValues.get(gaugeName) || 0;
      observableResult.observe(value, config.tags || {});
    });

    this.gauges.set(gaugeName, gauge);
    return gauge;
  }

  /**
   * Increment a counter
   */
  public increment(
    name: string,
    tags?: Record<string, string>,
    value: number = 1
  ): void {
    let counter = this.counters.get(name);

    if (!counter) {
      counter = this.createCounter({
        name,
        type: MetricType.COUNTER
      });
    }

    counter.add(value, tags || {});
  }

  /**
   * Record a histogram value
   */
  public histogram(
    name: string,
    value: number,
    tags?: Record<string, string>
  ): void {
    let histogram = this.histograms.get(name);

    if (!histogram) {
      histogram = this.createHistogram({
        name,
        type: MetricType.HISTOGRAM
      });
    }

    histogram.record(value, tags || {});
  }

  /**
   * Set a gauge value
   */
  public gauge(
    name: string,
    value: number,
    tags?: Record<string, string>
  ): void {
    // Update the stored value
    this.gaugeValues.set(name, value);

    // Create gauge if it doesn't exist
    if (!this.gauges.has(name)) {
      this.createGauge({
        name,
        type: MetricType.GAUGE,
        tags
      });
    }
  }

  /**
   * Record HTTP request
   */
  public recordHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number
  ): void {
    const tags = {
      method,
      path,
      status: String(statusCode),
      status_class: `${Math.floor(statusCode / 100)}xx`
    };

    this.increment('http.requests.total', tags);
    this.histogram('http.request.duration', duration, tags);

    // Record error if status >= 400
    if (statusCode >= 400) {
      this.increment('http.errors.total', tags);
    }
  }

  /**
   * Record operation execution
   */
  public recordOperation(
    operation: string,
    duration: number,
    success: boolean,
    tags?: Record<string, string>
  ): void {
    const operationTags = {
      operation,
      success: String(success),
      ...tags
    };

    this.increment('operations.total', operationTags);
    this.histogram('operations.duration', duration, operationTags);

    if (!success) {
      this.increment('operations.errors.total', operationTags);
    }
  }

  /**
   * Record database query
   */
  public recordDatabaseQuery(
    operation: string,
    duration: number,
    success: boolean
  ): void {
    const tags = {
      operation,
      success: String(success)
    };

    this.increment('database.queries.total', tags);
    this.histogram('database.query.duration', duration, tags);
  }

  /**
   * Record cache operation
   */
  public recordCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'delete',
    key?: string
  ): void {
    this.increment('cache.operations.total', { operation });
  }

  /**
   * Record custom metric
   */
  public record(config: {
    name: string;
    value: number;
    type: MetricType;
    tags?: Record<string, string>;
  }): void {
    switch (config.type) {
      case MetricType.COUNTER:
        this.increment(config.name, config.tags, config.value);
        break;
      case MetricType.HISTOGRAM:
        this.histogram(config.name, config.value, config.tags);
        break;
      case MetricType.GAUGE:
        this.gauge(config.name, config.value, config.tags);
        break;
    }
  }

  /**
   * Time a function execution
   */
  public async time<T>(
    metricName: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = Date.now();
    let success = false;

    try {
      const result = await fn();
      success = true;
      return result;
    } catch (error) {
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.histogram(metricName, duration, {
        ...tags,
        success: String(success)
      });
    }
  }

  /**
   * Create a timer for manual timing
   */
  public startTimer(metricName: string, tags?: Record<string, string>) {
    const startTime = Date.now();

    return {
      end: (additionalTags?: Record<string, string>) => {
        const duration = Date.now() - startTime;
        this.histogram(metricName, duration, {
          ...tags,
          ...additionalTags
        });
        return duration;
      }
    };
  }

  /**
   * Get current metric value (for gauges)
   */
  public getGaugeValue(name: string): number | undefined {
    return this.gaugeValues.get(name);
  }

  /**
   * Flush all metrics
   */
  public async flush(): Promise<void> {
    logger.info('Flushing metrics...');
    // OpenTelemetry handles this automatically
  }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector();