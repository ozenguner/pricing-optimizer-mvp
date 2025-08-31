import { EmailTemplateEngine, TemplateData } from './EmailTemplateEngine.js';
import { EmailService } from './EmailService.js';
import { EmailMessage, EmailAddress, EmailResult } from '../../types/email.js';

export interface VerificationEmailData extends TemplateData {
  userEmail: string;
  userName: string;
  verificationUrl: string;
  verificationToken: string;
  expiresAt: Date;
  unsubscribeToken?: string;
}

export interface WelcomeEmailData extends TemplateData {
  userEmail: string;
  userName: string;
  dashboardUrl: string;
  createdAt: Date;
  verifiedAt: Date;
  unsubscribeToken?: string;
}

export interface PasswordResetEmailData extends TemplateData {
  userEmail: string;
  userName: string;
  resetUrl: string;
  resetToken: string;
  expiresAt: Date;
  unsubscribeToken?: string;
}

export class EmailTemplateService {
  private templateEngine: EmailTemplateEngine;
  private emailService: EmailService;

  constructor(emailService: EmailService, templateDir?: string) {
    this.emailService = emailService;
    this.templateEngine = new EmailTemplateEngine(templateDir);
  }

  async sendVerificationEmail(
    to: EmailAddress,
    data: VerificationEmailData
  ): Promise<EmailResult> {
    try {
      const html = await this.templateEngine.renderWithLayout('email-verification', {
        ...data,
        subject: 'Verify Your Email Address'
      });

      const message: EmailMessage = {
        to,
        from: this.emailService['config'].defaultFrom,
        subject: 'Verify Your Email Address - RateCard Lab',
        html,
        text: this.generatePlainTextVerification(data)
      };

      return await this.emailService.sendEmail(message);
    } catch (error) {
      throw new Error(`Failed to send verification email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sendWelcomeEmail(
    to: EmailAddress,
    data: WelcomeEmailData
  ): Promise<EmailResult> {
    try {
      const html = await this.templateEngine.renderWithLayout('welcome', {
        ...data,
        subject: 'Welcome to RateCard Lab!'
      });

      const message: EmailMessage = {
        to,
        from: this.emailService['config'].defaultFrom,
        subject: 'Welcome to RateCard Lab! 🎉',
        html,
        text: this.generatePlainTextWelcome(data)
      };

      return await this.emailService.sendEmail(message);
    } catch (error) {
      throw new Error(`Failed to send welcome email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sendPasswordResetEmail(
    to: EmailAddress,
    data: PasswordResetEmailData
  ): Promise<EmailResult> {
    try {
      // Create password reset template if it doesn't exist
      const templateExists = await this.templateEngine.templateExists('password-reset');
      if (!templateExists) {
        throw new Error('Password reset template not found');
      }

      const html = await this.templateEngine.renderWithLayout('password-reset', {
        ...data,
        subject: 'Reset Your Password'
      });

      const message: EmailMessage = {
        to,
        from: this.emailService['config'].defaultFrom,
        subject: 'Reset Your Password - RateCard Lab',
        html,
        text: this.generatePlainTextPasswordReset(data)
      };

      return await this.emailService.sendEmail(message);
    } catch (error) {
      throw new Error(`Failed to send password reset email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sendCustomTemplateEmail(
    templateName: string,
    to: EmailAddress,
    data: TemplateData,
    subject: string,
    useLayout: boolean = true
  ): Promise<EmailResult> {
    try {
      const html = useLayout 
        ? await this.templateEngine.renderWithLayout(templateName, data)
        : await this.templateEngine.render(templateName, data);

      const message: EmailMessage = {
        to,
        from: this.emailService['config'].defaultFrom,
        subject,
        html
      };

      return await this.emailService.sendEmail(message);
    } catch (error) {
      throw new Error(`Failed to send custom template email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Plain text email generation for better deliverability
  private generatePlainTextVerification(data: VerificationEmailData): string {
    return `
Verify Your Email Address - RateCard Lab

Welcome to RateCard Lab! We're excited to have you on board.

To get started with your pricing optimization platform, please verify your email address by visiting this link:

${data.verificationUrl}

IMPORTANT: This verification link will expire in ${this.formatExpiryTime(data.expiresAt)}.

What happens after verification?
Once you verify your email address, you'll be able to:
• Access your pricing optimization dashboard
• Create and manage rate cards  
• Import and export pricing data
• Use our advanced pricing calculators
• Organize your rate cards with folders

Need Help?
If you're having trouble with email verification or have any questions, contact our support team at ${data.supportEmail || 'support@ratecardlab.com'}.

This email was sent to ${data.userEmail} because you created an account with RateCard Lab.

© ${new Date().getFullYear()} RateCard Lab. All rights reserved.
`.trim();
  }

  private generatePlainTextWelcome(data: WelcomeEmailData): string {
    return `
Welcome to RateCard Lab! 🎉

Congratulations! Your email has been verified and your account is now active.

You're now ready to start optimizing your pricing strategies. Access your dashboard:
${data.dashboardUrl}

What You Can Do Now:
• Create comprehensive rate cards with our intuitive builder
• Organize rate cards with hierarchical folders
• Use advanced pricing calculators
• Import and export pricing data seamlessly

Quick Start Guide:
1. Access your dashboard using the link above
2. Create your first folder to organize rate cards
3. Build a rate card using our builder
4. Test pricing calculations with sample data
5. Share or export your rate cards as needed

Your Account Details:
Account Email: ${data.userEmail}
Account Name: ${data.userName}
Account Created: ${data.createdAt.toLocaleDateString()}
Email Verified: ${data.verifiedAt.toLocaleDateString()}

Resources & Support:
• Documentation: ${data.baseUrl || 'https://ratecardlab.com'}/docs
• Video Tutorials: ${data.baseUrl || 'https://ratecardlab.com'}/tutorials  
• Support Center: ${data.baseUrl || 'https://ratecardlab.com'}/support
• Email Support: ${data.supportEmail || 'support@ratecardlab.com'}

Welcome aboard! We can't wait to see what you'll build.

© ${new Date().getFullYear()} RateCard Lab. All rights reserved.
`.trim();
  }

  private generatePlainTextPasswordReset(data: PasswordResetEmailData): string {
    return `
Reset Your Password - RateCard Lab

Hello ${data.userName},

We received a request to reset your password for your RateCard Lab account.

To reset your password, visit this link:
${data.resetUrl}

IMPORTANT: This password reset link will expire in ${this.formatExpiryTime(data.expiresAt)}.

If you didn't request this password reset, please ignore this email. Your account remains secure.

For security reasons, this link can only be used once and will expire automatically.

Need help? Contact our support team at ${data.supportEmail || 'support@ratecardlab.com'}.

© ${new Date().getFullYear()} RateCard Lab. All rights reserved.
`.trim();
  }

  private formatExpiryTime(expiresAt: Date): string {
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    
    if (diffHours <= 1) return '1 hour';
    if (diffHours < 24) return `${diffHours} hours`;
    
    const diffDays = Math.ceil(diffHours / 24);
    return diffDays === 1 ? '1 day' : `${diffDays} days`;
  }

  // Utility methods
  async precompileTemplates(): Promise<void> {
    const commonTemplates = ['base', 'email-verification', 'welcome'];
    await this.templateEngine.precompileTemplates(commonTemplates);
  }

  async templateExists(templateName: string): Promise<boolean> {
    return await this.templateEngine.templateExists(templateName);
  }

  clearTemplateCache(): void {
    this.templateEngine.clearCache();
  }

  getCachedTemplates(): string[] {
    return this.templateEngine.getCachedTemplates();
  }

  getTemplateDir(): string {
    return this.templateEngine.getTemplateDir();
  }

  // Email template validation
  async validateTemplate(templateName: string, sampleData: TemplateData): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.templateEngine.render(templateName, sampleData);
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown validation error'
      };
    }
  }

  // Generate sample data for template testing
  generateSampleVerificationData(): VerificationEmailData {
    return {
      userEmail: 'user@example.com',
      userName: 'John Doe',
      verificationUrl: 'https://ratecardlab.com/verify?token=sample-token',
      verificationToken: 'sample-token-123',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      baseUrl: 'https://ratecardlab.com',
      supportEmail: 'support@ratecardlab.com'
    };
  }

  generateSampleWelcomeData(): WelcomeEmailData {
    const now = new Date();
    return {
      userEmail: 'user@example.com',
      userName: 'John Doe',
      dashboardUrl: 'https://ratecardlab.com/dashboard',
      createdAt: now,
      verifiedAt: now,
      baseUrl: 'https://ratecardlab.com',
      supportEmail: 'support@ratecardlab.com'
    };
  }
}