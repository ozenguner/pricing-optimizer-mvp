export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  cid?: string; // For inline attachments
}

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailMessage {
  to: EmailAddress | EmailAddress[];
  from: EmailAddress;
  replyTo?: EmailAddress;
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
  templateId?: string;
  templateData?: Record<string, any>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
  attempts: number;
  timestamp: Date;
}

export interface EmailProviderConfig {
  name: string;
  priority: number; // Lower number = higher priority
  enabled: boolean;
}

export interface SendGridConfig extends EmailProviderConfig {
  apiKey: string;
}

export interface SMTPConfig extends EmailProviderConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EtherealConfig extends EmailProviderConfig {
  // Ethereal will generate test credentials automatically
}

export interface EmailServiceConfig {
  defaultFrom: EmailAddress;
  providers: {
    sendgrid?: SendGridConfig;
    smtp?: SMTPConfig;
    ethereal?: EtherealConfig;
  };
  retryConfig: {
    maxAttempts: number;
    baseDelay: number; // milliseconds
    maxDelay: number; // milliseconds
  };
  logging: {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    logSensitiveData: boolean; // Should always be false in production
  };
}

export interface EmailProvider {
  name: string;
  isConfigured: boolean;
  sendEmail(message: EmailMessage): Promise<EmailResult>;
  validateConfig(): boolean;
}

export type EmailEnvironment = 'development' | 'staging' | 'production';