import { baseTemplate, buttonHtml, codeBlock } from './base.template';

export interface ForgotPasswordTemplateOptions {
  username: string;
  resetUrl: string;
  resetToken?: string; // if you want to show the token instead of uRl
  expiresIn: string; // the time that reset token will expire in
  appName?: string;
}

export function forgotPasswordTemplate(
  options: ForgotPasswordTemplateOptions,
): string {
  const {
    username,
    resetUrl,
    resetToken,
    expiresIn,
    appName = 'App',
  } = options;

  const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">
      Password Reset Request
    </h2>
    
    <p style="margin: 0 0 16px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
      Hi ${username},
    </p>
    
    <p style="margin: 0 0 16px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
      We received a request to reset your password. Click the button below to create a new password:
    </p>
    
    ${buttonHtml('Reset Password', resetUrl)}
    
    ${
      resetToken
        ? `
      <p style="margin: 0 0 8px; font-size: 14px; color: #71717a; text-align: center;">
        Or use this code:
      </p>
      ${codeBlock(resetToken)}
    `
        : ''
    }
    
    <p style="margin: 24px 0 0; font-size: 14px; color: #71717a; line-height: 1.6;">
      This link will expire in <strong>${expiresIn}</strong>.
    </p>
    
    <p style="margin: 16px 0 0; font-size: 14px; color: #71717a; line-height: 1.6;">
      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>
    
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e4e4e7;">
    
    <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${resetUrl}" style="color: #3b82f6; word-break: break-all;">${resetUrl}</a>
    </p>
  `;

  return baseTemplate({
    title: 'Reset Your Password',
    previewText: `Reset your password for ${appName}`,
    content,
    appName,
  });
}

/**
 * Plain text version for email clients that don't support HTML
 */
export function forgotPasswordPlainText(
  options: ForgotPasswordTemplateOptions,
): string {
  const {
    username,
    resetUrl,
    resetToken,
    expiresIn,
    appName = 'App',
  } = options;

  return `
Password Reset Request - ${appName}

Hi ${username},

We received a request to reset your password.

Click here to reset your password:
${resetUrl}

${resetToken ? `Or use this code: ${resetToken}\n` : ''}
This link will expire in ${expiresIn}.

If you didn't request a password reset, you can safely ignore this email.

---
This email was sent automatically. Please do not reply.
  `.trim();
}
