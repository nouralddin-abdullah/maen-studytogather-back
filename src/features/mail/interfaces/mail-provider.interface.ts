// the email message structure
export interface MailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string; // if you wanted to provide a fallback
  from?: string; // to overrider the default
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: MailAttachment[];
}

export interface MailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

// the result
export interface MailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// contract for providers - all providers must implement this
export interface IMailProvider {
  send(message: MailMessage): Promise<MailResult>;
}
