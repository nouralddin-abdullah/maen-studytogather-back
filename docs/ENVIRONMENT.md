# Environment Variables Documentation

> Complete reference for all environment variables used in this NestJS template.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Application](#application)
- [Security](#security)
- [Database](#database)
- [Authentication](#authentication)
- [Storage](#storage)
- [Email](#email)
- [Redis](#redis)
- [Complete Example](#complete-example)

---

## Quick Start

```bash
# Copy the example file
cp .env.example .env

# Edit with your values
code .env
```

> **Important:** Never commit your `.env` file to version control!

---

## Application

### Basic Settings

| Variable      | Type   | Default                 | Required | Description                                           |
| ------------- | ------ | ----------------------- | -------- | ----------------------------------------------------- |
| `NODE_ENV`    | string | `development`           | No       | Environment mode: `development`, `production`, `test` |
| `PORT`        | number | `3000`                  | No       | Port the server listens on                            |
| `CORS_ORIGIN` | string | `http://localhost:3000` | No       | Comma-separated list of allowed origins               |

**Example:**

```env
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

### Rate Limiting

| Variable         | Type   | Default | Required | Description                  |
| ---------------- | ------ | ------- | -------- | ---------------------------- |
| `THROTTLE_TTL`   | number | `60`    | No       | Time window in seconds       |
| `THROTTLE_LIMIT` | number | `10`    | No       | Max requests per time window |

**Example:**

```env
# 10 requests per 60 seconds per IP
THROTTLE_TTL=60
THROTTLE_LIMIT=10
```

---

## Security

### JWT Configuration

| Variable         | Type   | Default                   | Required       | Description                 |
| ---------------- | ------ | ------------------------- | -------------- | --------------------------- |
| `JWT_SECRET`     | string | `change-me-in-production` | **Yes** (prod) | Secret key for signing JWTs |
| `JWT_EXPIRES_IN` | string | `24h`                     | No             | Token expiration time       |

**Example:**

```env
# Use a long, random string in production!
JWT_SECRET=my-super-secret-key-at-least-32-characters-long
JWT_EXPIRES_IN=24h
```

**Generating a secure secret:**

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# OpenSSL
openssl rand -hex 64
```

---

## Database

### PostgreSQL

| Variable      | Type   | Default     | Required | Description       |
| ------------- | ------ | ----------- | -------- | ----------------- |
| `DB_HOST`     | string | `localhost` | No       | Database host     |
| `DB_PORT`     | number | `5432`      | No       | Database port     |
| `DB_USERNAME` | string | `postgres`  | No       | Database user     |
| `DB_PASSWORD` | string | `postgres`  | No       | Database password |
| `DB_DATABASE` | string | `nestjs_db` | No       | Database name     |

**Example - Local:**

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=nestjs_db
```

**Example - Supabase:**

```env
# Use the Session Pooler for serverless
DB_HOST=db.abcdefghijklmnop.supabase.co
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-supabase-password
DB_DATABASE=postgres
```

**Example - Docker:**

```env
DB_HOST=db  # Service name in docker-compose
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=secure-password-here
DB_DATABASE=app
```

---

## Authentication

### Google OAuth

| Variable               | Type   | Default                 | Required  | Description                |
| ---------------------- | ------ | ----------------------- | --------- | -------------------------- |
| `GOOGLE_CLIENT_ID`     | string | -                       | For OAuth | Google OAuth client ID     |
| `GOOGLE_CLIENT_SECRET` | string | -                       | For OAuth | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL`  | string | -                       | For OAuth | OAuth callback URL         |
| `FRONTEND_URL`         | string | `http://localhost:3000` | No        | Redirect URL after OAuth   |

**Setup Steps:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client IDs**
5. Configure the consent screen if prompted
6. Set application type to **Web application**
7. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/users/auth/google/callback`
   - Production: `https://yourapp.com/api/users/auth/google/callback`

**Example:**

```env
GOOGLE_CLIENT_ID=123456789-abcdefghij.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnop
GOOGLE_CALLBACK_URL=http://localhost:3000/api/users/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

---

## Storage

### Cloud Storage (S3 / R2)

| Variable             | Type   | Default     | Required    | Description                    |
| -------------------- | ------ | ----------- | ----------- | ------------------------------ |
| `STORAGE_PROVIDER`   | string | `s3`        | No          | Provider: `s3` or `r2`         |
| `STORAGE_ENDPOINT`   | string | -           | For R2      | Custom endpoint URL            |
| `STORAGE_REGION`     | string | `us-east-1` | No          | AWS region (use `auto` for R2) |
| `STORAGE_ACCESS_KEY` | string | -           | For storage | Access key ID                  |
| `STORAGE_SECRET_KEY` | string | -           | For storage | Secret access key              |
| `STORAGE_BUCKET`     | string | -           | For storage | Bucket name                    |
| `STORAGE_PUBLIC_URL` | string | -           | No          | Custom public URL (CDN)        |

**Example - AWS S3:**

```env
STORAGE_PROVIDER=s3
STORAGE_ENDPOINT=
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
STORAGE_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
STORAGE_BUCKET=my-app-uploads
STORAGE_PUBLIC_URL=https://my-app-uploads.s3.amazonaws.com
```

**Example - Cloudflare R2:**

```env
STORAGE_PROVIDER=r2
STORAGE_ENDPOINT=https://abc123def456.r2.cloudflarestorage.com
STORAGE_REGION=auto
STORAGE_ACCESS_KEY=your-r2-access-key
STORAGE_SECRET_KEY=your-r2-secret-key
STORAGE_BUCKET=my-bucket
STORAGE_PUBLIC_URL=https://cdn.yourapp.com
```

**Example - MinIO (Self-hosted S3):**

```env
STORAGE_PROVIDER=s3
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_BUCKET=uploads
STORAGE_PUBLIC_URL=http://localhost:9000/uploads
```

---

## Email

### Mail Configuration

| Variable             | Type    | Default               | Required | Description                            |
| -------------------- | ------- | --------------------- | -------- | -------------------------------------- |
| `MAIL_PROVIDER`      | string  | `smtp`                | No       | Provider: `smtp`, `sendgrid`, `resend` |
| `MAIL_FROM`          | string  | `noreply@example.com` | No       | Default sender address                 |
| `MAIL_QUEUE_ENABLED` | boolean | `false`               | No       | Enable async queue (requires Redis)    |

### SMTP Settings

| Variable      | Type    | Default     | Required | Description                 |
| ------------- | ------- | ----------- | -------- | --------------------------- |
| `SMTP_HOST`   | string  | `localhost` | For SMTP | SMTP server host            |
| `SMTP_PORT`   | number  | `587`       | For SMTP | SMTP server port            |
| `SMTP_SECURE` | boolean | `false`     | No       | Use TLS (true for port 465) |
| `SMTP_USER`   | string  | -           | For SMTP | SMTP username               |
| `SMTP_PASS`   | string  | -           | For SMTP | SMTP password               |

**Example - Gmail:**

```env
MAIL_PROVIDER=smtp
MAIL_FROM="My App <noreply@myapp.com>"
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Use App Password, not regular password!
```

> **Gmail Setup:** Enable 2FA, then generate an [App Password](https://support.google.com/accounts/answer/185833)

**Example - Amazon SES:**

```env
MAIL_PROVIDER=smtp
MAIL_FROM="My App <noreply@myapp.com>"
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=AKIAIOSFODNN7EXAMPLE
SMTP_PASS=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### SendGrid

| Variable           | Type   | Default | Required     | Description      |
| ------------------ | ------ | ------- | ------------ | ---------------- |
| `SENDGRID_API_KEY` | string | -       | For SendGrid | SendGrid API key |

**Example:**

```env
MAIL_PROVIDER=sendgrid
MAIL_FROM="My App <noreply@myapp.com>"
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
```

### Resend

| Variable         | Type   | Default | Required   | Description    |
| ---------------- | ------ | ------- | ---------- | -------------- |
| `RESEND_API_KEY` | string | -       | For Resend | Resend API key |

**Example:**

```env
MAIL_PROVIDER=resend
MAIL_FROM="My App <noreply@myapp.com>"
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
```

---

## Redis

### Redis Configuration

Required only when `MAIL_QUEUE_ENABLED=true`.

| Variable         | Type   | Default     | Required  | Description               |
| ---------------- | ------ | ----------- | --------- | ------------------------- |
| `REDIS_HOST`     | string | `localhost` | For queue | Redis host                |
| `REDIS_PORT`     | number | `6379`      | For queue | Redis port                |
| `REDIS_USERNAME` | string | `default`   | No        | Redis username (Redis 6+) |
| `REDIS_PASSWORD` | string | -           | No        | Redis password            |

**Example - Local:**

```env
MAIL_QUEUE_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

**Example - Redis Cloud:**

```env
MAIL_QUEUE_ENABLED=true
REDIS_HOST=redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com
REDIS_PORT=12345
REDIS_USERNAME=default
REDIS_PASSWORD=your-redis-password
```

**Example - Docker:**

```env
MAIL_QUEUE_ENABLED=true
REDIS_HOST=redis  # Service name in docker-compose
REDIS_PORT=6379
REDIS_PASSWORD=
```

---

## Complete Example

### Development (.env)

```env
# Application
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# JWT
JWT_SECRET=dev-secret-change-in-production-please
JWT_EXPIRES_IN=7d

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=nestjs_dev

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/users/auth/google/callback
FRONTEND_URL=http://localhost:3000

# Storage (optional)
STORAGE_PROVIDER=s3
STORAGE_ENDPOINT=
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_BUCKET=
STORAGE_PUBLIC_URL=

# Email
MAIL_PROVIDER=smtp
MAIL_FROM="Dev App <dev@localhost>"
MAIL_QUEUE_ENABLED=false

# SMTP (for testing, use Mailhog or similar)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=

# Redis (only if MAIL_QUEUE_ENABLED=true)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Production

```env
# Application
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://myapp.com,https://www.myapp.com

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=10

# JWT - USE A STRONG SECRET!
JWT_SECRET=super-long-random-string-generated-securely-64-chars-minimum
JWT_EXPIRES_IN=24h

# Database
DB_HOST=your-db-host.com
DB_PORT=5432
DB_USERNAME=app_user
DB_PASSWORD=very-secure-password
DB_DATABASE=app_production

# Google OAuth
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_CALLBACK_URL=https://myapp.com/api/users/auth/google/callback
FRONTEND_URL=https://myapp.com

# Storage
STORAGE_PROVIDER=r2
STORAGE_ENDPOINT=https://xxxxx.r2.cloudflarestorage.com
STORAGE_REGION=auto
STORAGE_ACCESS_KEY=xxxxx
STORAGE_SECRET_KEY=xxxxx
STORAGE_BUCKET=production-uploads
STORAGE_PUBLIC_URL=https://cdn.myapp.com

# Email
MAIL_PROVIDER=resend
MAIL_FROM="My App <noreply@myapp.com>"
MAIL_QUEUE_ENABLED=true
RESEND_API_KEY=re_xxxxx

# Redis
REDIS_HOST=redis.myapp.com
REDIS_PORT=6379
REDIS_PASSWORD=secure-redis-password
```

---

## Security Best Practices

### ✅ Do

- Use strong, unique `JWT_SECRET` in production (64+ characters)
- Store secrets in environment variables or secret managers
- Use different credentials for dev/staging/production
- Rotate secrets periodically
- Use SSL/TLS connections for database and Redis

### ❌ Don't

- Commit `.env` files to version control
- Use default passwords in production
- Share production credentials
- Log sensitive values
- Hardcode secrets in code

### Secret Managers

For production, consider using:

- **AWS Secrets Manager**
- **Google Cloud Secret Manager**
- **Azure Key Vault**
- **HashiCorp Vault**
- **Doppler**

---

## Troubleshooting

### Common Issues

**"Missing required environment variable"**

- Check if the variable is set in your `.env` file
- Ensure no typos in variable names
- Verify the `.env` file is in the project root

**"Environment variable must be a number"**

- Remove quotes around numeric values
- Ensure no spaces before/after the value

**Database connection refused**

- Verify `DB_HOST` is correct
- Check if database server is running
- Ensure firewall allows connections

**SMTP authentication failed**

- For Gmail: Use App Password, not regular password
- Check SMTP credentials are correct
- Verify SMTP port matches security setting

---

_For more help, check the [README](../README.md) or open an issue._
