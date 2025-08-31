import { EmailMessage, EmailResult, EmailServiceConfig } from '../../types/email.js';

export interface EmailLogEntry {
  id: string;
  timestamp: Date;
  type: 'send_attempt' | 'send_success' | 'send_failure' | 'provider_fallback' | 'retry_attempt';
  provider: string;
  messageId?: string;
  subject: string;
  recipient: string; // Sanitized email address
  sender: string; // Sanitized email address
  error?: string;
  attempts?: number;
  metadata?: Record<string, any>;
}

export class EmailLogger {
  private config: EmailServiceConfig['logging'];
  private logs: EmailLogEntry[] = [];
  private maxLogs: number = 10000; // Keep last 10k logs in memory

  constructor(config: EmailServiceConfig['logging']) {
    this.config = config;
  }

  logSendAttempt(message: EmailMessage, provider: string, attempt: number = 1): void {
    if (!this.config.enabled) return;

    const entry: EmailLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'send_attempt',
      provider,
      subject: message.subject,
      recipient: this.sanitizeEmail(Array.isArray(message.to) ? message.to[0].email : message.to.email),
      sender: this.sanitizeEmail(message.from.email),
      attempts: attempt,
      metadata: this.config.logSensitiveData ? {
        templateId: message.templateId,
        hasAttachments: !!(message.attachments && message.attachments.length > 0),
        templateDataKeys: message.templateData ? Object.keys(message.templateData) : undefined
      } : undefined
    };

    this.addLog(entry);
    this.log('info', `Email send attempt #${attempt} to ${entry.recipient} via ${provider}`);
  }

  logSendSuccess(result: EmailResult, message: EmailMessage): void {
    if (!this.config.enabled) return;

    const entry: EmailLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'send_success',
      provider: result.provider,
      messageId: result.messageId,
      subject: message.subject,
      recipient: this.sanitizeEmail(Array.isArray(message.to) ? message.to[0].email : message.to.email),
      sender: this.sanitizeEmail(message.from.email),
      attempts: result.attempts
    };

    this.addLog(entry);
    this.log('info', `Email sent successfully to ${entry.recipient} via ${result.provider} (${result.messageId})`);
  }

  logSendFailure(result: EmailResult, message: EmailMessage): void {
    if (!this.config.enabled) return;

    const entry: EmailLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'send_failure',
      provider: result.provider,
      subject: message.subject,
      recipient: this.sanitizeEmail(Array.isArray(message.to) ? message.to[0].email : message.to.email),
      sender: this.sanitizeEmail(message.from.email),
      error: result.error,
      attempts: result.attempts
    };

    this.addLog(entry);
    this.log('error', `Email send failed to ${entry.recipient} via ${result.provider}: ${result.error}`);
  }

  logProviderFallback(fromProvider: string, toProvider: string, reason: string): void {
    if (!this.config.enabled) return;

    const entry: EmailLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'provider_fallback',
      provider: fromProvider,
      subject: 'N/A',
      recipient: 'N/A',
      sender: 'N/A',
      error: reason,
      metadata: { fallbackTo: toProvider }
    };

    this.addLog(entry);
    this.log('warn', `Falling back from ${fromProvider} to ${toProvider}: ${reason}`);
  }

  logRetryAttempt(provider: string, attempt: number, delay: number, reason: string): void {
    if (!this.config.enabled) return;

    const entry: EmailLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'retry_attempt',
      provider,
      subject: 'N/A',
      recipient: 'N/A',
      sender: 'N/A',
      attempts: attempt,
      metadata: { delay, reason }
    };

    this.addLog(entry);
    this.log('warn', `Retrying email send via ${provider} (attempt ${attempt}) after ${delay}ms delay: ${reason}`);
  }

  getRecentLogs(limit: number = 100): EmailLogEntry[] {
    return this.logs.slice(-limit);
  }

  getLogsByType(type: EmailLogEntry['type'], limit: number = 100): EmailLogEntry[] {
    return this.logs
      .filter(log => log.type === type)
      .slice(-limit);
  }

  getProviderStats(): Record<string, { attempts: number; successes: number; failures: number }> {
    const stats: Record<string, { attempts: number; successes: number; failures: number }> = {};

    this.logs.forEach(log => {
      if (!stats[log.provider]) {
        stats[log.provider] = { attempts: 0, successes: 0, failures: 0 };
      }

      switch (log.type) {
        case 'send_attempt':
          stats[log.provider].attempts++;
          break;
        case 'send_success':
          stats[log.provider].successes++;
          break;
        case 'send_failure':
          stats[log.provider].failures++;
          break;
      }
    });

    return stats;
  }

  clearLogs(): void {
    this.logs = [];
    this.log('info', 'Email logs cleared');
  }

  private sanitizeEmail(email: string): string {
    if (!this.config.logSensitiveData) {
      const [localPart, domain] = email.split('@');
      if (localPart.length <= 2) {
        return `${localPart[0]}***@${domain}`;
      }
      return `${localPart.substring(0, 2)}***@${domain}`;
    }
    return email;
  }

  private addLog(entry: EmailLogEntry): void {
    this.logs.push(entry);
    
    // Trim logs if they exceed max limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-Math.floor(this.maxLogs * 0.8)); // Keep 80% of max
    }
  }

  private generateId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(level: string, message: string): void {
    if (this.shouldLog(level)) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [EMAIL-${level.toUpperCase()}] ${message}`);
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= configLevelIndex;
  }
}