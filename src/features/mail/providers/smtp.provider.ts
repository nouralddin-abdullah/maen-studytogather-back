import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import {
  IMailProvider,
  MailMessage,
  MailResult,
  MailConfig,
} from '../interfaces';

/**
 * SMTP Mail Provider using Nodemailer
 * works with Gmail, Outlook, custom SMTP servers, etc (TESTING ONLY FOR DEVELOPMENT).
 */
export class SmtpProvider implements IMailProvider {
  private transporter: Transporter;
  private defaultFrom: string;

  constructor(config: MailConfig) {
    if (!config.smtp) {
      throw new Error('SMTP configuration is required for SMTP provider');
    }

    this.defaultFrom = config.from;
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure ?? config.smtp.port === 465,
      auth: {
        user: config.smtp.auth.user,
        pass: config.smtp.auth.pass,
      },
    });
  }

  async send(message: MailMessage): Promise<MailResult> {
    try {
      const result = await this.transporter.sendMail({
        from: message.from || this.defaultFrom,
        to: Array.isArray(message.to) ? message.to.join(', ') : message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo,
        cc: message.cc,
        bcc: message.bcc,
        attachments: message.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * verify smtp connection, might be used for health checks
   */
  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}
