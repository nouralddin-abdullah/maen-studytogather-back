import {
  IMailProvider,
  MailMessage,
  MailResult,
  MailConfig,
} from '../interfaces';

/**
 * SendGrid mall provider
 * this needs npm install @sendgrid/mail
 *
 * if you want to use SendGrid as provide uncomment the implementation when you want to use SendGrid.
 * this is kept as a stub to avoid requiring the dependency.
 */
export class SendGridProvider implements IMailProvider {
  private defaultFrom: string;
  private client: any; // Type: MailService from @sendgrid/mail

  constructor(config: MailConfig) {
    if (!config.sendgrid?.apiKey) {
      throw new Error('SendGrid API key is required');
    }

    this.defaultFrom = config.from;

    // uncomment when using SendGrid:
    // import sgMail from '@sendgrid/mail';
    // sgMail.setApiKey(config.sendgrid.apiKey);
    // this.client = sgMail;

    throw new Error(
      'SendGrid provider not configured. Install @sendgrid/mail and uncomment the implementation.',
    );
  }

  async send(message: MailMessage): Promise<MailResult> {
    try {
      const msg = {
        to: message.to,
        from: message.from || this.defaultFrom,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo,
        cc: message.cc,
        bcc: message.bcc,
      };

      const [response] = await this.client.send(msg);

      return {
        success: true,
        messageId: response.headers['x-message-id'],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
