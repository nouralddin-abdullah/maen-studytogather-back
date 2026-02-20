// injection tokens for runtime
export const MAIL_CONFIG = 'MAIL_CONFIG';
export const MAIL_PROVIDER = 'MAIL_PROVIDER';

// queue names
export const MAIL_QUEUE = 'mail-queue';

// supported mail providers
export enum MailProviderType {
  SMTP = 'smtp',
  SENDGRID = 'sendgrid',
  RESEND = 'resend',
}

// job names for queue (BULL QUEUE)
export enum MailJobName {
  SEND_EMAIL = 'send-email',
}
