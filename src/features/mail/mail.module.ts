import { DynamicModule, Module, Provider, Logger } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bullmq';

// Services
import { MailService } from './services/mail.service';
import { MailProcessor } from './services/mail.processor';

// Constants
import {
  MAIL_CONFIG,
  MAIL_PROVIDER,
  MAIL_QUEUE,
  MailProviderType,
} from './constants/mail.constants';

// Interfaces
import {
  MailConfig,
  MailModuleAsyncOptions,
  IMailProvider,
} from './interfaces';

// Providers
import { SmtpProvider } from './providers/smtp.provider';
import { SendGridProvider } from './providers/sendgrid.provider';
import { ResendProvider } from './providers/resend.provider';

// Core imports
import { secrets } from '@core/config';

@Module({})
export class MailModule {
  private static readonly logger = new Logger(MailModule.name);

  /**
   * register mail module with async config
   * queue is automatically enabled/disabled based on MAIL_QUEUE_ENABLED env var
   *
   * Environment variables:
   * - MAIL_QUEUE_ENABLED: 'true' or 'false' (default: false)
   * - REDIS_HOST: Redis host (default: localhost)
   * - REDIS_PORT: Redis port (default: 6379)
   * - REDIS_PASSWORD: Redis password (optional)
   */
  static forRootAsync(options: MailModuleAsyncOptions): DynamicModule {
    const queueEnabled = secrets.mail.queueEnabled;

    this.logger.log(
      `Initializing MailModule with queue: ${queueEnabled ? 'enabled' : 'disabled'}`,
    );

    const configProvider: Provider = {
      provide: MAIL_CONFIG,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    const mailProvider: Provider = {
      provide: MAIL_PROVIDER,
      useFactory: (config: MailConfig): IMailProvider => {
        return MailModule.createProvider(config);
      },
      inject: [MAIL_CONFIG],
    };

    // Base setup
    const imports: any[] = [...(options.imports || [])];
    const providers: Provider[] = [configProvider, mailProvider, MailService];

    if (queueEnabled) {
      // Add BullMQ with Redis when queue is enabled
      const redisConfig = secrets.redis;
      this.logger.log(
        `Connecting to Redis at ${redisConfig.host}:${redisConfig.port}`,
      );

      imports.push(
        BullModule.forRoot({
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            username: redisConfig.username,
            password: redisConfig.password || undefined,
          },
        }),
        BullModule.registerQueue({
          name: MAIL_QUEUE,
        }),
      );
      providers.push(MailProcessor);
    } else {
      // Provide null queue when disabled (using BullMQ's token format)
      providers.push({
        provide: getQueueToken(MAIL_QUEUE),
        useValue: null,
      });
    }

    return {
      module: MailModule,
      global: options.isGlobal ?? false,
      imports,
      providers,
      exports: [MailService],
    };
  }

  /**
   * based on config -> create the right mail provider
   */
  private static createProvider(config: MailConfig): IMailProvider {
    this.logger.log(`Creating mail provider: ${config.provider}`);

    switch (config.provider) {
      case MailProviderType.SMTP:
        return new SmtpProvider(config);
      case MailProviderType.SENDGRID:
        return new SendGridProvider(config);
      case MailProviderType.RESEND:
        return new ResendProvider(config);
      default:
        throw new Error(`Unknown mail provider: ${config.provider}`);
    }
  }
}
