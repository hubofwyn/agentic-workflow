/**
 * Alert Management System
 * Handles sending alerts through various channels (Slack, Email, PagerDuty, etc.)
 */

import axios from 'axios';
import { Logger } from './logger';

const logger = new Logger('AlertManager');

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Alert channels
 */
export enum AlertChannel {
  SLACK = 'slack',
  EMAIL = 'email',
  PAGERDUTY = 'pagerduty',
  WEBHOOK = 'webhook',
  CONSOLE = 'console'
}

/**
 * Alert configuration
 */
export interface Alert {
  severity: AlertSeverity;
  title: string;
  message: string;
  context?: Record<string, any>;
  channels?: AlertChannel[];
  tags?: string[];
  timestamp?: Date;
}

/**
 * Alert channel configuration
 */
export interface ChannelConfig {
  enabled: boolean;
  config: Record<string, any>;
}

/**
 * Alert manager for sending notifications
 */
export class AlertManager {
  private channels: Map<AlertChannel, ChannelConfig> = new Map();
  private alertHistory: Alert[] = [];
  private maxHistorySize = 100;
  private rateLimiter = new Map<string, number>();
  private rateLimitWindow = 300000; // 5 minutes

  constructor() {
    this.initializeChannels();
  }

  /**
   * Initialize alert channels from environment
   */
  private initializeChannels(): void {
    // Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      this.channels.set(AlertChannel.SLACK, {
        enabled: true,
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_CHANNEL || '#alerts',
          username: process.env.SLACK_USERNAME || 'Alert Bot'
        }
      });
    }

    // Email
    if (process.env.SMTP_HOST) {
      this.channels.set(AlertChannel.EMAIL, {
        enabled: true,
        config: {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          from: process.env.EMAIL_FROM,
          to: process.env.ALERT_EMAIL_TO?.split(',') || []
        }
      });
    }

    // PagerDuty
    if (process.env.PAGERDUTY_INTEGRATION_KEY) {
      this.channels.set(AlertChannel.PAGERDUTY, {
        enabled: true,
        config: {
          integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY
        }
      });
    }

    // Console (always enabled in development)
    this.channels.set(AlertChannel.CONSOLE, {
      enabled: process.env.NODE_ENV === 'development',
      config: {}
    });

    logger.info('Alert channels initialized', {
      channels: Array.from(this.channels.keys())
    });
  }

  /**
   * Send an alert
   */
  public async send(alert: Alert): Promise<void> {
    // Add timestamp
    alert.timestamp = alert.timestamp || new Date();

    // Check rate limiting
    if (this.isRateLimited(alert)) {
      logger.warn('Alert rate limited', { title: alert.title });
      return;
    }

    // Record in history
    this.addToHistory(alert);

    // Determine channels to use
    const channels = alert.channels || this.getDefaultChannels(alert.severity);

    // Send to all channels
    const promises = channels.map(channel => this.sendToChannel(alert, channel));

    try {
      await Promise.allSettled(promises);
      logger.info('Alert sent', {
        title: alert.title,
        severity: alert.severity,
        channels: channels
      });
    } catch (error) {
      logger.error('Failed to send alert', {
        title: alert.title,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Send alert to specific channel
   */
  private async sendToChannel(alert: Alert, channel: AlertChannel): Promise<void> {
    const channelConfig = this.channels.get(channel);

    if (!channelConfig || !channelConfig.enabled) {
      logger.debug(`Channel ${channel} not enabled, skipping`);
      return;
    }

    try {
      switch (channel) {
        case AlertChannel.SLACK:
          await this.sendToSlack(alert, channelConfig.config);
          break;
        case AlertChannel.EMAIL:
          await this.sendToEmail(alert, channelConfig.config);
          break;
        case AlertChannel.PAGERDUTY:
          await this.sendToPagerDuty(alert, channelConfig.config);
          break;
        case AlertChannel.CONSOLE:
          this.sendToConsole(alert);
          break;
        case AlertChannel.WEBHOOK:
          await this.sendToWebhook(alert, channelConfig.config);
          break;
      }
    } catch (error) {
      logger.error(`Failed to send alert to ${channel}`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Send alert to Slack
   */
  private async sendToSlack(alert: Alert, config: any): Promise<void> {
    const color = this.getSeverityColor(alert.severity);

    const payload = {
      channel: config.channel,
      username: config.username,
      attachments: [
        {
          color: color,
          title: alert.title,
          text: alert.message,
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true
            },
            {
              title: 'Time',
              value: alert.timestamp?.toISOString(),
              short: true
            }
          ],
          footer: 'Agentic Workflow',
          ts: Math.floor((alert.timestamp?.getTime() || Date.now()) / 1000)
        }
      ]
    };

    // Add context as fields if present
    if (alert.context) {
      const contextFields = Object.entries(alert.context)
        .slice(0, 5) // Limit to 5 fields
        .map(([key, value]) => ({
          title: key,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value),
          short: true
        }));

      payload.attachments[0].fields.push(...contextFields);
    }

    await axios.post(config.webhookUrl, payload);
  }

  /**
   * Send alert to email
   */
  private async sendToEmail(alert: Alert, config: any): Promise<void> {
    // This would use nodemailer or similar
    // Simplified implementation
    logger.info('Email alert would be sent', {
      to: config.to,
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`
    });
  }

  /**
   * Send alert to PagerDuty
   */
  private async sendToPagerDuty(alert: Alert, config: any): Promise<void> {
    const payload = {
      routing_key: config.integrationKey,
      event_action: 'trigger',
      payload: {
        summary: alert.title,
        severity: alert.severity,
        source: 'agentic-workflow',
        custom_details: alert.context
      }
    };

    await axios.post('https://events.pagerduty.com/v2/enqueue', payload);
  }

  /**
   * Send alert to console
   */
  private sendToConsole(alert: Alert): void {
    const emoji = this.getSeverityEmoji(alert.severity);
    console.log(`\n${emoji} ALERT [${alert.severity.toUpperCase()}]: ${alert.title}`);
    console.log(`Message: ${alert.message}`);
    if (alert.context) {
      console.log('Context:', JSON.stringify(alert.context, null, 2));
    }
    console.log('');
  }

  /**
   * Send alert to webhook
   */
  private async sendToWebhook(alert: Alert, config: any): Promise<void> {
    await axios.post(config.url, {
      alert,
      timestamp: alert.timestamp?.toISOString()
    });
  }

  /**
   * Check if alert is rate limited
   */
  private isRateLimited(alert: Alert): boolean {
    const key = `${alert.title}:${alert.severity}`;
    const lastSent = this.rateLimiter.get(key);

    if (!lastSent) {
      this.rateLimiter.set(key, Date.now());
      return false;
    }

    const timeSinceLastSent = Date.now() - lastSent;

    if (timeSinceLastSent < this.rateLimitWindow) {
      return true;
    }

    this.rateLimiter.set(key, Date.now());
    return false;
  }

  /**
   * Add alert to history
   */
  private addToHistory(alert: Alert): void {
    this.alertHistory.unshift(alert);

    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory.pop();
    }
  }

  /**
   * Get default channels based on severity
   */
  private getDefaultChannels(severity: AlertSeverity): AlertChannel[] {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return [AlertChannel.SLACK, AlertChannel.PAGERDUTY, AlertChannel.EMAIL];
      case AlertSeverity.HIGH:
        return [AlertChannel.SLACK, AlertChannel.EMAIL];
      case AlertSeverity.WARNING:
        return [AlertChannel.SLACK];
      case AlertSeverity.INFO:
      default:
        return [AlertChannel.CONSOLE];
    }
  }

  /**
   * Get color for severity level (Slack)
   */
  private getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return '#dc3545'; // Red
      case AlertSeverity.HIGH:
        return '#fd7e14'; // Orange
      case AlertSeverity.WARNING:
        return '#ffc107'; // Yellow
      case AlertSeverity.INFO:
      default:
        return '#17a2b8'; // Blue
    }
  }

  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return '🚨';
      case AlertSeverity.HIGH:
        return '⚠️';
      case AlertSeverity.WARNING:
        return '⚡';
      case AlertSeverity.INFO:
      default:
        return 'ℹ️';
    }
  }

  /**
   * Get alert history
   */
  public getHistory(limit: number = 10): Alert[] {
    return this.alertHistory.slice(0, limit);
  }

  /**
   * Clear alert history
   */
  public clearHistory(): void {
    this.alertHistory = [];
    this.rateLimiter.clear();
  }

  /**
   * Configure a channel
   */
  public configureChannel(channel: AlertChannel, config: ChannelConfig): void {
    this.channels.set(channel, config);
    logger.info(`Channel ${channel} configured`);
  }
}

// Export singleton instance
export const alertManager = new AlertManager();