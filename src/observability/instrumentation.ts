/**
 * OpenTelemetry Instrumentation
 * Sets up distributed tracing, metrics, and logging
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { config } from '../config';

// Create resource with service information
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: config.otel.serviceName,
  [SemanticResourceAttributes.SERVICE_VERSION]: config.app.version,
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.app.env
});

// Configure trace exporter
const traceExporter = new OTLPTraceExporter({
  url: config.otel.endpoint
});

// Configure metrics exporter
const metricsExporter = new PrometheusExporter({
  port: config.monitoring.port
});

// Initialize OpenTelemetry SDK
const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader: metricsExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable default logging to prevent conflicts
      '@opentelemetry/instrumentation-fs': {
        enabled: false
      },
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingPaths: ['/health', '/metrics']
      },
      '@opentelemetry/instrumentation-express': {
        enabled: true
      }
    })
  ]
});

// Start SDK
sdk.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('OpenTelemetry SDK shut down successfully'))
    .catch((error) => console.log('Error shutting down OpenTelemetry SDK', error))
    .finally(() => process.exit(0));
});

export default sdk;