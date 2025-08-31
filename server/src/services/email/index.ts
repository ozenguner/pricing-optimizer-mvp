// Main EmailService exports
export { EmailService } from './EmailService.js';
export { EmailConfigLoader } from './EmailConfigLoader.js';
export { EmailLogger } from './EmailLogger.js';

// Template engine exports
export { EmailTemplateEngine } from './EmailTemplateEngine.js';
export { EmailTemplateService } from './EmailTemplateService.js';
export type { TemplateData, CompiledTemplate } from './EmailTemplateEngine.js';
export type { 
  VerificationEmailData, 
  WelcomeEmailData, 
  PasswordResetEmailData 
} from './EmailTemplateService.js';

// Provider exports
export { BaseEmailProvider } from './providers/BaseEmailProvider.js';
export { SendGridProvider } from './providers/SendGridProvider.js';
export { SMTPProvider } from './providers/SMTPProvider.js';
export { EtherealProvider } from './providers/EtherealProvider.js';

// Type exports from types directory
export * from '../../types/email.js';