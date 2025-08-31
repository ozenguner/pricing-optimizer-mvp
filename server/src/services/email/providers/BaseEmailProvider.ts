import { EmailProvider, EmailMessage, EmailResult, EmailProviderConfig } from '../../../types/email.js';

export abstract class BaseEmailProvider implements EmailProvider {
  protected config: EmailProviderConfig;
  
  constructor(config: EmailProviderConfig) {
    this.config = config;
  }

  get name(): string {
    return this.config.name;
  }

  get isConfigured(): boolean {
    return this.config.enabled && this.validateConfig();
  }

  abstract sendEmail(message: EmailMessage): Promise<EmailResult>;
  abstract validateConfig(): boolean;

  protected createResult(
    success: boolean, 
    messageId?: string, 
    error?: string, 
    attempts: number = 1
  ): EmailResult {
    return {
      success,
      messageId,
      error,
      provider: this.name,
      attempts,
      timestamp: new Date()
    };
  }

  protected sanitizeEmailForLogging(message: EmailMessage): Partial<EmailMessage> {
    return {
      to: Array.isArray(message.to) 
        ? message.to.map(addr => ({ email: addr.email.replace(/(.{2}).*(@.*)/, '$1***$2'), name: addr.name }))
        : { email: message.to.email.replace(/(.{2}).*(@.*)/, '$1***$2'), name: message.to.name },
      from: { 
        email: message.from.email.replace(/(.{2}).*(@.*)/, '$1***$2'), 
        name: message.from.name 
      },
      subject: message.subject,
      templateId: message.templateId
    };
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}