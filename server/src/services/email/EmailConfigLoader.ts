import { 
  EmailServiceConfig, 
  EmailEnvironment, 
  SendGridConfig, 
  SMTPConfig, 
  EtherealConfig,
  EmailAddress 
} from '../../types/email.js';

export class EmailConfigLoader {
  static loadFromEnvironment(): EmailServiceConfig {
    const environment = (process.env.NODE_ENV || 'development') as EmailEnvironment;
    
    const config: EmailServiceConfig = {
      defaultFrom: this.getDefaultFromAddress(),
      providers: {},
      retryConfig: {
        maxAttempts: parseInt(process.env.EMAIL_MAX_RETRY_ATTEMPTS || '3'),
        baseDelay: parseInt(process.env.EMAIL_BASE_RETRY_DELAY || '1000'),
        maxDelay: parseInt(process.env.EMAIL_MAX_RETRY_DELAY || '10000')
      },
      logging: {
        enabled: process.env.EMAIL_LOGGING_ENABLED !== 'false',
        logLevel: (process.env.EMAIL_LOG_LEVEL || 'info') as any,
        logSensitiveData: process.env.NODE_ENV === 'development' && 
                          process.env.EMAIL_LOG_SENSITIVE_DATA === 'true'
      }
    };

    // Load provider configurations based on environment
    this.loadProvidersForEnvironment(config, environment);

    return config;
  }

  private static getDefaultFromAddress(): EmailAddress {
    const email = process.env.EMAIL_DEFAULT_FROM_ADDRESS || 'noreply@ratecardlab.com';
    const name = process.env.EMAIL_DEFAULT_FROM_NAME || 'RateCard Lab';
    
    return { email, name };
  }

  private static loadProvidersForEnvironment(
    config: EmailServiceConfig, 
    environment: EmailEnvironment
  ): void {
    switch (environment) {
      case 'production':
        this.loadProductionProviders(config);
        break;
      case 'staging':
        this.loadStagingProviders(config);
        break;
      case 'development':
      default:
        this.loadDevelopmentProviders(config);
        break;
    }
  }

  private static loadProductionProviders(config: EmailServiceConfig): void {
    // Primary: SendGrid
    if (process.env.SENDGRID_API_KEY) {
      config.providers.sendgrid = {
        name: 'SendGrid',
        priority: 1,
        enabled: true,
        apiKey: process.env.SENDGRID_API_KEY
      };
    }

    // Fallback: SMTP
    if (this.hasRequiredSMTPConfig()) {
      config.providers.smtp = {
        name: 'SMTP',
        priority: 2,
        enabled: true,
        host: process.env.SMTP_HOST!,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER!,
          pass: process.env.SMTP_PASS!
        }
      };
    }
  }

  private static loadStagingProviders(config: EmailServiceConfig): void {
    // Primary: SMTP
    if (this.hasRequiredSMTPConfig()) {
      config.providers.smtp = {
        name: 'SMTP',
        priority: 1,
        enabled: true,
        host: process.env.SMTP_HOST!,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER!,
          pass: process.env.SMTP_PASS!
        }
      };
    }

    // Fallback: SendGrid (if available)
    if (process.env.SENDGRID_API_KEY) {
      config.providers.sendgrid = {
        name: 'SendGrid',
        priority: 2,
        enabled: true,
        apiKey: process.env.SENDGRID_API_KEY
      };
    }

    // Development fallback: Ethereal
    config.providers.ethereal = {
      name: 'Ethereal',
      priority: 3,
      enabled: true
    };
  }

  private static loadDevelopmentProviders(config: EmailServiceConfig): void {
    // Primary: Ethereal (for development)
    config.providers.ethereal = {
      name: 'Ethereal',
      priority: 1,
      enabled: true
    };

    // Optional: SMTP (if configured)
    if (this.hasRequiredSMTPConfig()) {
      config.providers.smtp = {
        name: 'SMTP',
        priority: 2,
        enabled: process.env.EMAIL_ENABLE_SMTP_IN_DEV === 'true',
        host: process.env.SMTP_HOST!,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER!,
          pass: process.env.SMTP_PASS!
        }
      };
    }

    // Optional: SendGrid (if configured and enabled for dev)
    if (process.env.SENDGRID_API_KEY && process.env.EMAIL_ENABLE_SENDGRID_IN_DEV === 'true') {
      config.providers.sendgrid = {
        name: 'SendGrid',
        priority: 3,
        enabled: true,
        apiKey: process.env.SENDGRID_API_KEY
      };
    }
  }

  private static hasRequiredSMTPConfig(): boolean {
    return !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );
  }

  static validateConfig(config: EmailServiceConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if at least one provider is configured and enabled
    const enabledProviders = Object.values(config.providers).filter(p => p?.enabled);
    if (enabledProviders.length === 0) {
      errors.push('At least one email provider must be configured and enabled');
    }

    // Validate default from address
    if (!config.defaultFrom.email || !this.isValidEmail(config.defaultFrom.email)) {
      errors.push('Default from email address is required and must be valid');
    }

    // Validate retry configuration
    if (config.retryConfig.maxAttempts < 1 || config.retryConfig.maxAttempts > 10) {
      errors.push('Max retry attempts must be between 1 and 10');
    }

    if (config.retryConfig.baseDelay < 100 || config.retryConfig.baseDelay > 60000) {
      errors.push('Base retry delay must be between 100ms and 60 seconds');
    }

    if (config.retryConfig.maxDelay < config.retryConfig.baseDelay) {
      errors.push('Max retry delay must be greater than or equal to base delay');
    }

    // Validate provider-specific configurations
    if (config.providers.sendgrid?.enabled) {
      const sg = config.providers.sendgrid as SendGridConfig;
      if (!sg.apiKey || !sg.apiKey.startsWith('SG.')) {
        errors.push('SendGrid API key is required and must start with "SG."');
      }
    }

    if (config.providers.smtp?.enabled) {
      const smtp = config.providers.smtp as SMTPConfig;
      if (!smtp.host || !smtp.auth?.user || !smtp.auth?.pass) {
        errors.push('SMTP configuration requires host, user, and password');
      }
      if (smtp.port < 1 || smtp.port > 65535) {
        errors.push('SMTP port must be between 1 and 65535');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static getConfigSummary(config: EmailServiceConfig): string {
    const enabledProviders = Object.entries(config.providers)
      .filter(([_, provider]) => provider?.enabled)
      .sort(([_, a], [__, b]) => (a?.priority || 999) - (b?.priority || 999))
      .map(([name, provider]) => `${name} (priority: ${provider?.priority})`)
      .join(', ');

    return `Email Service Configuration:
- Environment: ${process.env.NODE_ENV || 'development'}
- Default From: ${config.defaultFrom.name} <${config.defaultFrom.email}>
- Enabled Providers: ${enabledProviders || 'None'}
- Max Retry Attempts: ${config.retryConfig.maxAttempts}
- Logging: ${config.logging.enabled ? 'Enabled' : 'Disabled'} (${config.logging.logLevel})`;
  }
}