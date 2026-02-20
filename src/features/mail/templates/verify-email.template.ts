import { baseTemplate, buttonHtml, codeBlock } from './base.template';

export interface VerifyEmailTemplateOptions {
  username: string;
  verifyUrl: string;
  verifyToken?: string; // if you want to also show the token
  expiresIn: string; // the time that verify token will expire in
  appName?: string;
}

export function verifyEmailTemplate(
  options: VerifyEmailTemplateOptions,
): string {
  const {
    username,
    verifyUrl,
    verifyToken,
    expiresIn,
    appName = 'App',
  } = options;

  const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">
      Verify Your Email Address
    </h2>
    
    <p style="margin: 0 0 16px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
      Hi ${username},
    </p>
    
    <p style="margin: 0 0 16px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
      Thanks for signing up! Please verify your email address by clicking the button below:
    </p>
    
    ${buttonHtml('Verify Email', verifyUrl)}
    
    ${
      verifyToken
        ? `
      <p style="margin: 0 0 8px; font-size: 14px; color: #71717a; text-align: center;">
        Or enter this code:
      </p>
      ${codeBlock(verifyToken)}
    `
        : ''
    }
    
    <p style="margin: 24px 0 0; font-size: 14px; color: #71717a; line-height: 1.6;">
      This link will expire in <strong>${expiresIn}</strong>.
    </p>
    
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e4e4e7;">
    
    <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${verifyUrl}" style="color: #3b82f6; word-break: break-all;">${verifyUrl}</a>
    </p>
  `;

  return baseTemplate({
    title: 'Verify Your Email',
    previewText: `Please verify your email for ${appName}`,
    content,
    appName,
  });
}

// plain text version
export function verifyEmailPlainText(
  options: VerifyEmailTemplateOptions,
): string {
  const {
    username,
    verifyUrl,
    verifyToken,
    expiresIn,
    appName = 'App',
  } = options;

  return `
Verify Your Email - ${appName}

Hi ${username},

Thanks for signing up! Please verify your email address by clicking the link below:

${verifyUrl}

${verifyToken ? `Or enter this code: ${verifyToken}\n` : ''}
This link will expire in ${expiresIn}.

---
This email was sent automatically. Please do not reply.
  `.trim();
}
