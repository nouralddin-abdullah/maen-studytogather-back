import { ModuleMetadata } from '@nestjs/common';
import { MailProviderType } from '../constants/mail.constants';

// SMTP configuration
export interface SmtpConfig {
  host: string;
  port: number;
  secure?: boolean; // true for 465, false for other ports
  auth: {
    user: string;
    pass: string;
  };
}

// SendGrid configuration
export interface SendGridConfig {
  apiKey: string;
}

// resend configuration
export interface ResendConfig {
  apiKey: string;
}

// main mail configuration
export interface MailConfig {
  provider: MailProviderType;
  from: string; // default from address
  smtp?: SmtpConfig;
  sendgrid?: SendGridConfig;
  resend?: ResendConfig;
  // queue for options
  queue?: {
    enabled: boolean;
    defaultJobOptions?: {
      attempts?: number;
      backoff?: {
        type: 'fixed' | 'exponential';
        delay: number;
      };
      removeOnComplete?: boolean | number;
      removeOnFail?: boolean | number;
    };
  };
}

// redis configurations for the queue with bullmq
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

// async module options
export interface MailModuleAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  useFactory: (...args: any[]) => Promise<MailConfig> | MailConfig;
  inject?: any[];
  isGlobal?: boolean;
}
