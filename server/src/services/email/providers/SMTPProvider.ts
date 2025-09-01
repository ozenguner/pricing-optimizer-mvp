import nodemailer from 'nodemailer';
import { BaseEmailProvider } from './BaseEmailProvider.js';
import { EmailMessage, EmailResult, SMTPConfig, EmailAddress } from '../../../types/email.js';

export class SMTPProvider extends BaseEmailProvider {
  protected config: SMTPConfig;
  private transporter: nodemailer.Transporter | null = null;

  constructor(config: SMTPConfig) {
    super(config);
    this.config = config;
    if (this.isConfigured) {
      this.createTransporter();
    }
  }

  validateConfig(): boolean {
    return !!(
      this.config.host &&
      this.config.port &&
      this.config.auth?.user &&
      this.config.auth?.pass
    );
  }

  private createTransporter(): void {
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.auth.user,
        pass: this.config.auth.pass
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000, // 1 second
      rateLimit: 10 // 10 emails per second
    });
  }

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    if (!this.isConfigured || !this.transporter) {
      return this.createResult(false, undefined, 'SMTP not configured');
    }

    try {
      const smtpMessage = this.convertToSMTPFormat(message);
      const result = await this.transporter.sendMail(smtpMessage);
      
      return this.createResult(
        true,
        result.messageId,
        undefined
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown SMTP error';
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

  async close(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
    }
  }
}