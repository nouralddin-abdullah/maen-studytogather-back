import { baseTemplate, buttonHtml } from './base.template';

export interface WelcomeTemplateOptions {
  username: string;
  loginUrl?: string;
  appName?: string;
  features?: string[]; // optinla list of features
}

export function welcomeTemplate(options: WelcomeTemplateOptions): string {
  const { username, loginUrl = '#', appName = 'App', features = [] } = options;

  const featuresHtml =
    features.length > 0
      ? `
    <div style="margin: 24px 0; padding: 20px; background-color: #f4f4f5; border-radius: 8px;">
      <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #18181b;">
        Here's what you can do:
      </p>
      <ul style="margin: 0; padding-left: 20px; color: #3f3f46;">
        ${features.map((f) => `<li style="margin: 8px 0;">${f}</li>`).join('')}
      </ul>
    </div>
  `
      : '';

  const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">
      Welcome to ${appName}! 🎉
    </h2>
    
    <p style="margin: 0 0 16px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
      Hi ${username},
    </p>
    
    <p style="margin: 0 0 16px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
      Your account has been created successfully. We're excited to have you on board!
    </p>
    
    ${featuresHtml}
    
    ${buttonHtml('Get Started', loginUrl)}
    
    <p style="margin: 24px 0 0; font-size: 14px; color: #71717a; line-height: 1.6;">
      If you have any questions, feel free to reach out to our support team.
    </p>
  `;

  return baseTemplate({
    title: `Welcome to ${appName}`,
    previewText: `Welcome to ${appName}, ${username}!`,
    content,
    appName,
  });
}

// the plan text version for unsupported html
export function welcomePlainText(options: WelcomeTemplateOptions): string {
  const { username, loginUrl = '#', appName = 'App', features = [] } = options;

  const featuresList =
    features.length > 0
      ? `\nHere's what you can do:\n${features.map((f) => `- ${f}`).join('\n')}\n`
      : '';

  return `
Welcome to ${appName}!

Hi ${username},

Your account has been created successfully. We're excited to have you on board!
${featuresList}
Get started: ${loginUrl}

If you have any questions, feel free to reach out to our support team.

---
This email was sent automatically. Please do not reply.
  `.trim();
}
