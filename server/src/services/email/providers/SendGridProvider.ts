import sgMail from '@sendgrid/mail';
import { BaseEmailProvider } from './BaseEmailProvider.js';
import { EmailMessage, EmailResult, SendGridConfig, EmailAddress } from '../../../types/email.js';

export class SendGridProvider extends BaseEmailProvider {
  private config: SendGridConfig;

  constructor(config: SendGridConfig) {
    super(config);
    this.config = config;
    if (this.isConfigured) {
      sgMail.setApiKey(this.config.apiKey);
    }
  }

  validateConfig(): boolean {
    return !!(this.config.apiKey && this.config.apiKey.startsWith('SG.'));
  }

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    if (!this.isConfigured) {
      return this.createResult(false, undefined, 'SendGrid not configured');
    }

    try {
      const sgMessage = this.convertToSendGridFormat(message);
      const [response] = await sgMail.send(sgMessage);
      
      return this.createResult(
        true,
        response.headers['x-message-id'] as string,
        undefined
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown SendGrid error';
      return this.createResult(false, undefined, errorMessage);
    }
  }

  private convertToSendGridFormat(message: EmailMessage) {
    const formatAddress = (addr: EmailAddress) => ({
      email: addr.email,
      ...(addr.name && { name: addr.name })
    });

    return {
      to: Array.isArray(message.to) ? message.to.map(formatAddress) : formatAddress(message.to),
      from: formatAddress(message.from),
      ...(message.replyTo && { replyTo: formatAddress(message.replyTo) }),
      subject: message.subject,
      ...(message.text && { text: message.text }),
      ...(message.html && { html: message.html }),
      ...(message.attachments && {
        attachments: message.attachments.map(att => ({
          filename: att.filename,
          content: typeof att.content === 'string' 
            ? Buffer.from(att.content).toString('base64')
            : att.content.toString('base64'),
          type: att.contentType,
          disposition: 'attachment',
          ...(att.cid && { contentId: att.cid })
        }))
      }),
      ...(message.templateId && { templateId: message.templateId }),
      ...(message.templateData && { dynamicTemplateData: message.templateData })
    };
  }
}