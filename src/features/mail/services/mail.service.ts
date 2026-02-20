import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

// Constants
import {
  MAIL_CONFIG,
  MAIL_PROVIDER,
  MAIL_QUEUE,
  MailJobName,
} from '../constants/mail.constants';

// Interfaces
import type {
  IMailProvider,
  MailMessage,
  MailResult,
  MailConfig,
} from '../interfaces';

// Core imports
import { secrets } from '@core/config';

// Templates
import {
  forgotPasswordTemplate,
  forgotPasswordPlainText,
  ForgotPasswordTemplateOptions,
  verifyEmailTemplate,
  verifyEmailPlainText,
  VerifyEmailTemplateOptions,
  welcomeTemplate,
  welcomePlainText,
  WelcomeTemplateOptions,
} from '../templates';

/**
 * mailService - for sending emails
 *
 * Supports two modes:
 * 1. direct sending (sync) - waiting for emails to be sent (returns when email is sent), good for tests
 * 2. queue-based (async) - for background processing -> using bullmq, make sure u set MAIL_QUEUE_ENABLED=true and config redis
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly queueEnabled: boolean;
  private readonly mailQueue: Queue | null;

  constructor(
    @Inject(MAIL_CONFIG)
    private readonly config: MailConfig,
    @Inject(MAIL_PROVIDER)
    private readonly provider: IMailProvider,
    @Optional()
    @InjectQueue(MAIL_QUEUE)
    mailQueue?: Queue,
  ) {
    this.mailQueue = mailQueue ?? null;
    this.queueEnabled = secrets.mail.queueEnabled && this.mailQueue !== null;
    this.logger.log(
      `Mail service initialized. Queue: ${this.queueEnabled ? 'enabled' : 'disabled'}`,
    );
  }

  /**
   * send direct email bypass the queue
   * forces the sync (rare cases might be used)
   */
  async sendDirect(message: MailMessage): Promise<MailResult> {
    this.logger.debug(`Sending email directly to: ${message.to}`);
    try {
      const result = await this.provider.send(message);
      if (result.success) {
        this.logger.log(
          `Email sent successfully to: ${message.to}, messageId: ${result.messageId}`,
        );
      } else {
        this.logger.error(
          `Failed to send email to: ${message.to}, error: ${result.error}`,
        );
      }
      return result;
    } catch (error) {
      this.logger.error(
        `Email send threw exception: ${error instanceof Error ? error.message : error}`,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * send email via queue (async)
   * falls back to direct send if queue is disabled
   * if u called send but the queue was disabled it falls back to the sendDirect
   */
  async send(
    message: MailMessage,
  ): Promise<{ queued: boolean; jobId?: string } | MailResult> {
    if (!this.queueEnabled || !this.mailQueue) {
      this.logger.debug('Queue disabled, sending email directly');
      return this.sendDirect(message);
    }

    const job = await this.mailQueue.add(MailJobName.SEND_EMAIL, message, {
      ...this.config.queue?.defaultJobOptions,
    });

    this.logger.debug(`Email queued with job ID: ${job.id}`);

    return {
      queued: true,
      jobId: job.id,
    };
  }

  // methods for email types

  /**
   * send password rest email
   */
  async sendPasswordReset(
    to: string,
    options: ForgotPasswordTemplateOptions,
  ): Promise<{ queued: boolean; jobId?: string } | MailResult> {
    return this.send({
      to,
      subject: 'Reset Your Password',
      html: forgotPasswordTemplate({ ...options, appName: options.appName }),
      text: forgotPasswordPlainText({ ...options, appName: options.appName }),
    });
  }

  /**
   * sending email verification
   */
  async sendEmailVerification(
    to: string,
    options: VerifyEmailTemplateOptions,
  ): Promise<{ queued: boolean; jobId?: string } | MailResult> {
    return this.send({
      to,
      subject: 'Verify Your Email',
      html: verifyEmailTemplate({ ...options, appName: options.appName }),
      text: verifyEmailPlainText({ ...options, appName: options.appName }),
    });
  }

  /**
   * sending a welcome message
   */
  async sendWelcome(
    to: string,
    options: WelcomeTemplateOptions,
  ): Promise<{ queued: boolean; jobId?: string } | MailResult> {
    return this.send({
      to,
      subject: `Welcome to ${options.appName || 'App'}!`,
      html: welcomeTemplate(options),
      text: welcomePlainText(options),
    });
  }

  // QUEUE HELPERS

  // to get queue stats
  async getQueueStats() {
    if (!this.queueEnabled || !this.mailQueue) {
      return { enabled: false };
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.mailQueue.getWaitingCount(),
      this.mailQueue.getActiveCount(),
      this.mailQueue.getCompletedCount(),
      this.mailQueue.getFailedCount(),
      this.mailQueue.getDelayedCount(),
    ]);

    return {
      enabled: true,
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  // clear all failed
  async clearFailedJobs(): Promise<void> {
    if (this.queueEnabled && this.mailQueue) {
      await this.mailQueue.clean(0, 1000, 'failed');
    }
  }

  // retry all failed jobs
  async retryFailedJobs(): Promise<void> {
    if (this.queueEnabled && this.mailQueue) {
      const failed = await this.mailQueue.getFailed();
      await Promise.all(failed.map((job) => job.retry()));
    }
  }
}
