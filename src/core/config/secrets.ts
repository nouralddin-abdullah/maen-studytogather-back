import { config } from 'dotenv';

// Load .env file
config();

/**
 * Helper to get env var with type conversion
 */
function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  // Remove quotes if present (common .env issue)
  return value.replace(/^["']|["']$/g, '');
}

function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined || value === '') {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  const parsed = parseInt(value.replace(/^["']|["']$/g, ''), 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return parsed;
}

function getEnvBoolean(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (value === undefined || value === '') return defaultValue;
  const cleaned = value.replace(/^["']|["']$/g, '').toLowerCase();
  return cleaned === 'true' || cleaned === '1';
}

/**
 * Centralized secrets configuration
 * All environment variables are loaded and typed here
 */
export const secrets = {
  // App
  nodeEnv: getEnv('NODE_ENV', 'development'),
  port: getEnvNumber('PORT', 3000),
  corsOrigin: getEnv('CORS_ORIGIN', 'http://localhost:3000'),

  // Rate limiting
  throttleTtl: getEnvNumber('THROTTLE_TTL', 60),
  throttleLimit: getEnvNumber('THROTTLE_LIMIT', 10),

  // JWT
  jwtSecret: getEnv('JWT_SECRET', 'change-me-in-production'),
  jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '24h'),

  // Database
  db: {
    host: getEnv('DB_HOST', 'localhost'),
    port: getEnvNumber('DB_PORT', 5432),
    username: getEnv('DB_USERNAME', 'postgres'),
    password: getEnv('DB_PASSWORD', 'postgres'),
    database: getEnv('DB_DATABASE', 'nestjs_db'),
  },

  // Google OAuth
  google: {
    clientId: getEnv('GOOGLE_CLIENT_ID', ''),
    clientSecret: getEnv('GOOGLE_CLIENT_SECRET', ''),
    callbackUrl: getEnv('GOOGLE_CALLBACK_URL', ''),
  },
  frontendUrl: getEnv('FRONTEND_URL', 'http://localhost:3000'),

  // Storage (S3/R2)
  storage: {
    provider: getEnv('STORAGE_PROVIDER', 's3') as 's3' | 'r2',
    endpoint: getEnv('STORAGE_ENDPOINT', ''),
    region: getEnv('STORAGE_REGION', 'us-east-1'),
    accessKey: getEnv('STORAGE_ACCESS_KEY', ''),
    secretKey: getEnv('STORAGE_SECRET_KEY', ''),
    bucket: getEnv('STORAGE_BUCKET', ''),
    publicUrl: getEnv('STORAGE_PUBLIC_URL', ''),
  },

  // Redis (for BullMQ)
  redis: {
    host: getEnv('REDIS_HOST', 'localhost'),
    port: getEnvNumber('REDIS_PORT', 6379),
    username: getEnv('REDIS_USERNAME', 'default'),
    password: getEnv('REDIS_PASSWORD', ''),
  },

  // Mail
  mail: {
    provider: getEnv('MAIL_PROVIDER', 'smtp') as 'smtp' | 'sendgrid' | 'resend',
    from: getEnv('MAIL_FROM', 'noreply@example.com'),
    queueEnabled: getEnvBoolean('MAIL_QUEUE_ENABLED', true),

    smtp: {
      host: getEnv('SMTP_HOST', 'localhost'),
      port: getEnvNumber('SMTP_PORT', 587),
      secure: getEnvBoolean('SMTP_SECURE', false),
      user: getEnv('SMTP_USER', ''),
      pass: getEnv('SMTP_PASS', ''),
    },

    sendgrid: {
      apiKey: getEnv('SENDGRID_API_KEY', ''),
    },

    resend: {
      apiKey: getEnv('RESEND_API_KEY', ''),
    },
  },
} as const;

// Debug log on startup (only in development)
if (secrets.nodeEnv === 'development') {
  console.log('[Secrets] Loaded configuration:');
  console.log(`  - Node Env: ${secrets.nodeEnv}`);
  console.log(`  - Mail Queue Enabled: ${secrets.mail.queueEnabled}`);
  console.log(`  - Redis Host: ${secrets.redis.host}:${secrets.redis.port}`);
}

export type Secrets = typeof secrets;
