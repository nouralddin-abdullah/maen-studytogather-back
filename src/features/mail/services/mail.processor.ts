import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  MAIL_QUEUE,
  MailJobName,
  MAIL_PROVIDER,
} from '../constants/mail.constants';
import type { IMailProvider, MailMessage } from '../interfaces';

/**
 * mail queue processor
 * handles async email sending via BullMQ
 */
@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(
    @Inject(MAIL_PROVIDER)
    private readonly mailProvider: IMailProvider,
  ) {
    super();
  }

  async process(job: Job<MailMessage, void, MailJobName>): Promise<void> {
    this.logger.debug(`Processing mail job ${job.id}: ${job.name}`);

    switch (job.name) {
      case MailJobName.SEND_EMAIL:
        await this.handleSendEmail(job);
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleSendEmail(job: Job<MailMessage>): Promise<void> {
    const message = job.data;

    this.logger.debug(`Sending email to: ${message.to}`);

    const result = await this.mailProvider.send(message);

    if (result.success) {
      this.logger.log(
        `Email sent successfully. MessageId: ${result.messageId}`,
      );
    } else {
      this.logger.error(`Failed to send email: ${result.error}`);
      // throwing error will trigger retry based on job options
      throw new Error(result.error);
    }
  }
}
