import {
  IMailProvider,
  MailMessage,
  MailResult,
  MailConfig,
} from '../interfaces';

/**
 * resend mall provider
 * this needs npm install resend
 *
 * if you want to use resend as provide uncomment the implementation when you want to use Resend.
 * this is kept as a stub to avoid requiring the dependency.
 */
export class ResendProvider implements IMailProvider {
  private defaultFrom: string;
  private client: any; // type: Resend from 'resend'

  constructor(config: MailConfig) {
    if (!config.resend?.apiKey) {
      throw new Error('Resend API key is required');
    }

    this.defaultFrom = config.from;

    // you must uncomment this if u want to use resend i didb't uncomment it by default to not get unused dependancies:
    // import { Resend } from 'resend';
    // this.client = new Resend(config.resend.apiKey);

    throw new Error(
      'Resend provider not configured. Install resend and uncomment the implementation.',
    );
  }

  async send(message: MailMessage): Promise<MailResult> {
    try {
      const result = await this.client.emails.send({
        from: message.from || this.defaultFrom,
        to: Array.isArray(message.to) ? message.to : [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        reply_to: message.replyTo,
        cc: message.cc
          ? Array.isArray(message.cc)
            ? message.cc
            : [message.cc]
          : undefined,
        bcc: message.bcc
          ? Array.isArray(message.bcc)
            ? message.bcc
            : [message.bcc]
          : undefined,
      });

      if (result.error) {
        return {
          success: false,
          error: result.error.message,
        };
      }

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
