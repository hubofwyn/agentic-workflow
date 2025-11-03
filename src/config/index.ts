/**
 * Configuration Management System
 * Centralized configuration with environment-based overrides and validation
 */

import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenvConfig();

/**
 * Configuration schema with validation
 */
const configSchema = z.object({
  // Application
  app: z.object({
    name: z.string().default('agentic-workflow'),
    version: z.string().default('1.0.0'),
    env: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    port: z.number().min(1).max(65535).default(3000),
    host: z.string().default('localhost')
  }),

  // Security
  security: z.object({
    jwtSecret: z.string().min(32),
    sessionSecret: z.string().min(32),
    encryptionKey: z.string().length(32),
    corsOrigin: z.string().or(z.array(z.string())).default('*')
  }),

  // Database
  database: z.object({
    url: z.string().url(),
    poolMin: z.number().min(0).default(2),
    poolMax: z.number().min(1).default(10),
    migrationTable: z.string().default('knex_migrations')
  }),

  // Redis
  redis: z.object({
    url: z.string().url(),
    prefix: z.string().default('agentic:'),
    ttl: z.number().min(0).default(3600)
  }),

  // AI/Claude
  claude: z.object({
    apiKey: z.string().min(1),
    model: z.string().default('claude-3-opus-20240229'),
    maxTokens: z.number().min(1000).max(200000).default(100000),
    temperature: z.number().min(0).max(1).default(0.7)
  }),

  // OpenTelemetry
  otel: z.object({
    serviceName: z.string().default('agentic-workflow'),
    endpoint: z.string().url(),
    protocol: z.enum(['grpc', 'http']).default('grpc'),
    tracesExporter: z.string().default('otlp'),
    metricsExporter: z.string().default('otlp'),
    logsExporter: z.string().default('otlp')
  }),

  // Logging
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    format: z.enum(['json', 'pretty']).default('json'),
    dir: z.string().default('./logs'),
    maxSize: z.number().default(10485760), // 10MB
    maxFiles: z.number().default(5),
    consoleEnabled: z.boolean().default(true)
  }),

  // Monitoring
  monitoring: z.object({
    enabled: z.boolean().default(true),
    port: z.number().default(9090),
    healthCheckEnabled: z.boolean().default(true),
    healthCheckPath: z.string().default('/health'),
    healthCheckInterval: z.number().default(30000)
  }),

  // Error Tracking
  sentry: z.object({
    dsn: z.string().optional(),
    environment: z.string().default('development'),
    sampleRate: z.number().min(0).max(1).default(0.1),
    tracesSampleRate: z.number().min(0).max(1).default(0.1)
  }),

  // GitHub
  github: z.object({
    token: z.string().optional(),
    owner: z.string().default('verlyn13'),
    repo: z.string().default('agentic-workflow')
  }),

  // Slack
  slack: z.object({
    webhookUrl: z.string().optional(),
    channel: z.string().default('#development'),
    username: z.string().default('Agentic Bot')
  }),

  // Email
  email: z.object({
    smtp: z.object({
      host: z.string().optional(),
      port: z.number().default(587),
      secure: z.boolean().default(false),
      user: z.string().optional(),
      pass: z.string().optional()
    }),
    from: z.string().optional()
  }),

  // Rate Limiting
  rateLimit: z.object({
    windowMs: z.number().default(900000), // 15 minutes
    maxRequests: z.number().default(100),
    skipSuccessfulRequests: z.boolean().default(false),
    skipFailedRequests: z.boolean().default(false)
  }),

  // Feature Flags
  features: z.object({
    aiReview: z.boolean().default(true),
    autoFix: z.boolean().default(true),
    autoDeploy: z.boolean().default(false),
    telemetry: z.boolean().default(true)
  }),

  // Development
  dev: z.object({
    mode: z.boolean().default(false),
    autoReload: z.boolean().default(true),
    sourceMaps: z.boolean().default(true),
    verboseErrors: z.boolean().default(true)
  })
});

/**
 * Configuration type
 */
export type Config = z.infer<typeof configSchema>;

/**
 * Load configuration from environment variables
 */
function loadConfig(): Config {
  const rawConfig = {
    app: {
      name: process.env.APP_NAME,
      version: process.env.APP_VERSION,
      env: process.env.NODE_ENV as any,
      port: process.env.PORT ? parseInt(process.env.PORT) : undefined,
      host: process.env.HOST
    },

    security: {
      jwtSecret: process.env.JWT_SECRET || 'development-secret-change-in-production-min-32-chars',
      sessionSecret: process.env.SESSION_SECRET || 'development-session-secret-change-min-32-chars',
      encryptionKey: process.env.ENCRYPTION_KEY || 'dev-encryption-key-32-chars!!',
      corsOrigin: process.env.CORS_ORIGIN
    },

    database: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/agentic_dev',
      poolMin: process.env.DATABASE_POOL_MIN ? parseInt(process.env.DATABASE_POOL_MIN) : undefined,
      poolMax: process.env.DATABASE_POOL_MAX ? parseInt(process.env.DATABASE_POOL_MAX) : undefined,
      migrationTable: process.env.DATABASE_MIGRATION_TABLE
    },

    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      prefix: process.env.REDIS_PREFIX,
      ttl: process.env.REDIS_TTL ? parseInt(process.env.REDIS_TTL) : undefined
    },

    claude: {
      apiKey: process.env.CLAUDE_API_KEY || 'development-api-key',
      model: process.env.CLAUDE_MODEL,
      maxTokens: process.env.CLAUDE_MAX_TOKENS ? parseInt(process.env.CLAUDE_MAX_TOKENS) : undefined,
      temperature: process.env.CLAUDE_TEMPERATURE ? parseFloat(process.env.CLAUDE_TEMPERATURE) : undefined
    },

    otel: {
      serviceName: process.env.OTEL_SERVICE_NAME,
      endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
      protocol: process.env.OTEL_EXPORTER_OTLP_PROTOCOL as any,
      tracesExporter: process.env.OTEL_TRACES_EXPORTER,
      metricsExporter: process.env.OTEL_METRICS_EXPORTER,
      logsExporter: process.env.OTEL_LOGS_EXPORTER
    },

    logging: {
      level: process.env.LOG_LEVEL as any,
      format: process.env.LOG_FORMAT as any,
      dir: process.env.LOG_DIR,
      maxSize: process.env.LOG_MAX_SIZE ? parseInt(process.env.LOG_MAX_SIZE) : undefined,
      maxFiles: process.env.LOG_MAX_FILES ? parseInt(process.env.LOG_MAX_FILES) : undefined,
      consoleEnabled: process.env.LOG_CONSOLE_ENABLED !== 'false'
    },

    monitoring: {
      enabled: process.env.METRICS_ENABLED !== 'false',
      port: process.env.METRICS_PORT ? parseInt(process.env.METRICS_PORT) : undefined,
      healthCheckEnabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
      healthCheckPath: process.env.HEALTH_CHECK_PATH,
      healthCheckInterval: process.env.HEALTH_CHECK_INTERVAL ? parseInt(process.env.HEALTH_CHECK_INTERVAL) : undefined
    },

    sentry: {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT,
      sampleRate: process.env.SENTRY_SAMPLE_RATE ? parseFloat(process.env.SENTRY_SAMPLE_RATE) : undefined,
      tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) : undefined
    },

    github: {
      token: process.env.GITHUB_TOKEN,
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO
    },

    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: process.env.SLACK_CHANNEL,
      username: process.env.SLACK_USERNAME
    },

    email: {
      smtp: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : undefined,
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      from: process.env.EMAIL_FROM
    },

    rateLimit: {
      windowMs: process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS) : undefined,
      maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) : undefined,
      skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true',
      skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED_REQUESTS === 'true'
    },

    features: {
      aiReview: process.env.FEATURE_AI_REVIEW !== 'false',
      autoFix: process.env.FEATURE_AUTO_FIX !== 'false',
      autoDeploy: process.env.FEATURE_AUTO_DEPLOY === 'true',
      telemetry: process.env.FEATURE_TELEMETRY !== 'false'
    },

    dev: {
      mode: process.env.DEV_MODE === 'true',
      autoReload: process.env.DEV_AUTO_RELOAD !== 'false',
      sourceMaps: process.env.DEV_SOURCE_MAPS !== 'false',
      verboseErrors: process.env.DEV_VERBOSE_ERRORS !== 'false'
    }
  };

  // Validate and return
  return configSchema.parse(rawConfig);
}

/**
 * Global configuration instance
 */
export const config = loadConfig();

/**
 * Check if running in production
 */
export const isProduction = config.app.env === 'production';

/**
 * Check if running in development
 */
export const isDevelopment = config.app.env === 'development';

/**
 * Check if running in test
 */
export const isTest = config.app.env === 'test';