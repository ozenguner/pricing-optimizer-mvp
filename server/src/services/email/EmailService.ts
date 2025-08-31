import { EmailProvider, EmailMessage, EmailResult, EmailServiceConfig } from '../../types/email.js';
import { SendGridProvider } from './providers/SendGridProvider.js';
import { SMTPProvider } from './providers/SMTPProvider.js';
import { EtherealProvider } from './providers/EtherealProvider.js';
import { EmailLogger } from './EmailLogger.js';
import { EmailConfigLoader } from './EmailConfigLoader.js';

export class EmailService {
  private config: EmailServiceConfig;
  private providers: EmailProvider[] = [];
  private logger: EmailLogger;

  constructor(config?: EmailServiceConfig) {
    this.config = config || EmailConfigLoader.loadFromEnvironment();
    this.logger = new EmailLogger(this.config.logging);
    this.initializeProviders();
    this.validateConfiguration();
  }

  private initializeProviders(): void {
    const providers: EmailProvider[] = [];

    // Initialize SendGrid provider
    if (this.config.providers.sendgrid?.enabled) {
      providers.push(new SendGridProvider(this.config.providers.sendgrid));
    }

    // Initialize SMTP provider
    if (this.config.providers.smtp?.enabled) {
      providers.push(new SMTPProvider(this.config.providers.smtp));
    }

    // Initialize Ethereal provider
    if (this.config.providers.ethereal?.enabled) {
      providers.push(new EtherealProvider(this.config.providers.ethereal));
    }

    // Sort providers by priority (lower number = higher priority)
    this.providers = providers
      .filter(provider => provider.isConfigured)
      .sort((a, b) => {
        const aConfig = this.getProviderConfig(a.name);
        const bConfig = this.getProviderConfig(b.name);
        return (aConfig?.priority || 999) - (bConfig?.priority || 999);
      });
  }

  private getProviderConfig(providerName: string) {
    const name = providerName.toLowerCase();
    return this.config.providers[name as keyof typeof this.config.providers];
  }

  private validateConfiguration(): void {
    const validation = EmailConfigLoader.validateConfig(this.config);
    if (!validation.valid) {
      throw new Error(`Invalid email configuration: ${validation.errors.join(', ')}`);
    }

    if (this.providers.length === 0) {
      throw new Error('No email providers are configured and available');
    }

    console.log(EmailConfigLoader.getConfigSummary(this.config));
  }

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    if (this.providers.length === 0) {
      return {
        success: false,
        error: 'No email providers available',
        provider: 'none',
        attempts: 0,
        timestamp: new Date()
      };
    }

    // Ensure message has a from address if not specified
    if (!message.from) {
      message.from = this.config.defaultFrom;
    }

    let lastError: string = 'Unknown error';
    
    // Try each provider in priority order
    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      
      try {
        const result = await this.sendWithRetry(provider, message);
        
        if (result.success) {
          this.logger.logSendSuccess(result, message);
          return result;
        } else {
          this.logger.logSendFailure(result, message);
          lastError = result.error || 'Unknown provider error';
          
          // If not the last provider, log fallback
          if (i < this.providers.length - 1) {
            const nextProvider = this.providers[i + 1];
            this.logger.logProviderFallback(
              provider.name, 
              nextProvider.name, 
              lastError
            );
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        lastError = errorMessage;
        
        this.logger.logSendFailure({
          success: false,
          error: errorMessage,
          provider: provider.name,
          attempts: 1,
          timestamp: new Date()
        }, message);

        // If not the last provider, log fallback
        if (i < this.providers.length - 1) {
          const nextProvider = this.providers[i + 1];
          this.logger.logProviderFallback(
            provider.name, 
            nextProvider.name, 
            errorMessage
          );
        }
      }
    }

    // All providers failed
    return {
      success: false,
      error: `All email providers failed. Last error: ${lastError}`,
      provider: 'all_failed',
      attempts: this.providers.length,
      timestamp: new Date()
    };
  }

  private async sendWithRetry(provider: EmailProvider, message: EmailMessage): Promise<EmailResult> {
    let lastResult: EmailResult | null = null;

    for (let attempt = 1; attempt <= this.config.retryConfig.maxAttempts; attempt++) {
      this.logger.logSendAttempt(message, provider.name, attempt);

      try {
        const result = await provider.sendEmail(message);
        result.attempts = attempt;

        if (result.success) {
          return result;
        }

        lastResult = result;

        // If this isn't the last attempt and the error might be retryable
        if (attempt < this.config.retryConfig.maxAttempts && this.isRetryableError(result.error)) {
          const delay = this.calculateRetryDelay(attempt);
          
          this.logger.logRetryAttempt(
            provider.name, 
            attempt + 1, 
            delay, 
            result.error || 'Unknown error'
          );

          await this.delay(delay);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        lastResult = {
          success: false,
          error: errorMessage,
          provider: provider.name,
          attempts: attempt,
          timestamp: new Date()
        };

        // Retry on exceptions too, if retryable
        if (attempt < this.config.retryConfig.maxAttempts && this.isRetryableError(errorMessage)) {
          const delay = this.calculateRetryDelay(attempt);
          
          this.logger.logRetryAttempt(
            provider.name, 
            attempt + 1, 
            delay, 
            errorMessage
          );

          await this.delay(delay);
        }
      }
    }

    return lastResult || {
      success: false,
      error: 'Max retry attempts exceeded',
      provider: provider.name,
      attempts: this.config.retryConfig.maxAttempts,
      timestamp: new Date()
    };
  }

  private isRetryableError(error?: string): boolean {
    if (!error) return false;

    const retryablePatterns = [
      /timeout/i,
      /network/i,
      /connection/i,
      /rate limit/i,
      /throttle/i,
      /502/,
      /503/,
      /504/,
      /temporary/i,
      /unavailable/i
    ];

    return retryablePatterns.some(pattern => pattern.test(error));
  }

  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.config.retryConfig.baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    const delay = Math.min(exponentialDelay + jitter, this.config.retryConfig.maxDelay);
    
    return Math.floor(delay);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Template methods (to be implemented later)
  async sendEmailWithTemplate(
    templateId: string,
    templateData: Record<string, any>,
    to: EmailMessage['to'],
    subject?: string
  ): Promise<EmailResult> {
    const message: EmailMessage = {
      to,
      from: this.config.defaultFrom,
      subject: subject || 'Email from RateCard Lab',
      templateId,
      templateData
    };

    return this.sendEmail(message);
  }

  // Utility methods
  getProviderStatus(): Array<{ name: string; configured: boolean; priority: number }> {
    return this.providers.map(provider => ({
      name: provider.name,
      configured: provider.isConfigured,
      priority: this.getProviderConfig(provider.name)?.priority || 999
    }));
  }

  getEmailStats() {
    return this.logger.getProviderStats();
  }

  getRecentLogs(limit: number = 100) {
    return this.logger.getRecentLogs(limit);
  }

  clearLogs(): void {
    this.logger.clearLogs();
  }

  // Health check method
  async healthCheck(): Promise<{ healthy: boolean; providers: Array<{ name: string; available: boolean }> }> {
    const providerChecks = this.providers.map(provider => ({
      name: provider.name,
      available: provider.isConfigured
    }));

    return {
      healthy: providerChecks.some(check => check.available),
      providers: providerChecks
    };
  }

  // Cleanup method
  async close(): Promise<void> {
    await Promise.all(
      this.providers
        .filter(provider => 'close' in provider)
        .map(provider => (provider as any).close())
    );
  }
}