import nodemailer from 'nodemailer';
import { BaseEmailProvider } from './BaseEmailProvider.js';
import { EmailMessage, EmailResult, EtherealConfig, EmailAddress } from '../../../types/email.js';

export class EtherealProvider extends BaseEmailProvider {
  protected config: EtherealConfig;
  private transporter: nodemailer.Transporter | null = null;
  private testAccount: nodemailer.TestAccount | null = null;

  constructor(config: EtherealConfig) {
    super(config);
    this.config = config;
  }

  validateConfig(): boolean {
    return this.config.enabled;
  }

  private async ensureTestAccount(): Promise<void> {
    if (!this.testAccount) {
      this.testAccount = await nodemailer.createTestAccount();
    }
  }

  private async createTransporter(): Promise<void> {
    await this.ensureTestAccount();
    if (!this.testAccount) {
      throw new Error('Failed to create Ethereal test account');
    }

    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: this.testAccount.user,
        pass: this.testAccount.pass
      }
    });
  }

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    if (!this.isConfigured) {
      return this.createResult(false, undefined, 'Ethereal not configured');
    }

    try {
      if (!this.transporter) {
        await this.createTransporter();
      }

      if (!this.transporter) {
        return this.createResult(false, undefined, 'Failed to create Ethereal transporter');
      }

      const smtpMessage = this.convertToSMTPFormat(message);
      const result = await this.transporter.sendMail(smtpMessage);
      
      // Generate preview URL for development
      const previewUrl = nodemailer.getTestMessageUrl(result);
      
      // Log the preview URL so developers can see their emails
      if (previewUrl) {
        console.log(`\n📧 Email Preview URL: ${previewUrl}`);
        console.log(`👆 Click this link to view the verification email in your browser\n`);
      }
      
      return this.createResult(
        true,
        result.messageId,
        undefined
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown Ethereal error';
      return this.createResult(false, undefined, errorMessage);
    }
  }

  private convertToSMTPFormat(message: EmailMessage) {
    const formatAddress = (addr: EmailAddress) => 
      addr.name ? `"${addr.name}" <${addr.email}>` : addr.email;

    return {
      to: Array.isArray(message.to) 
        ? message.to.map(formatAddress).join(', ')
        : formatAddress(message.to),
      from: formatAddress(message.from),
      ...(message.replyTo && { replyTo: formatAddress(message.replyTo) }),
      subject: message.subject,
      ...(message.text && { text: message.text }),
      ...(message.html && { html: message.html }),
      ...(message.attachments && {
        attachments: message.attachments.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
          ...(att.cid && { cid: att.cid })
        }))
      })
    };
  }

  async getPreviewUrl(messageId: string): Promise<string | null> {
    if (!this.transporter) return null;
    
    try {
      // This is a simplified approach - in reality, you'd store the result object
      // and generate the preview URL from it
      return `https://ethereal.email/message/${messageId}`;
    } catch {
      return null;
    }
  }

  getTestAccountInfo(): { user: string; pass: string } | null {
    return this.testAccount ? {
      user: this.testAccount.user,
      pass: this.testAccount.pass
    } : null;
  }

  async close(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
    }
  }
}