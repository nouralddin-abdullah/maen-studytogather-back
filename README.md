# NestJS Production Ready Template

A feature based pattern, production-ready NestJS template with authentication ready, dynamic cloud storage, dynamic email services, and best practices.

[![NestJS](https://img.shields.io/badge/NestJS-11.x-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Features

| Feature                        | Description                                             |
| ------------------------------ | ------------------------------------------------------- |
| **Feature Based Architecture** | Clean, scalable folder structure                        |
| **Authentication**             | JWT + Local + Google OAuth strategies                   |
| **Role Based Access Control**  | Admin, User roles with guards and roles hierarchy       |
| **Email Service**              | SMTP, SendGrid, Resend with queue support using bull mq |
| **Cloud Storage**              | AWS S3 & Cloudflare R2 support                          |
| **Database**                   | PostgreSQL with TypeORM & migrations                    |
| **Validation**                 | Zod schemas with automatic validation                   |
| **API Documentation**          | Swagger/OpenAPI auto-generated                          |
| **Security**                   | Helmet, CORS, rate limiting                             |
| **Logging**                    | Pino with pretty dev logs                               |
| **Health Checks**              | Database, Redis, memory, disk                           |
| **Docker Ready**               | Dev & production compose files                          |

---

## Project Structure

```
src/
├── main.ts                    # Application entry point
├── app.module.ts              # Root module
├── app.controller.ts          # Root controller
│
├── core/                      # Global singleton services
│   ├── config/                # Environment configuration
│   ├── database/              # TypeORM & migrations
│   ├── guards/                # JWT & Roles guards
│   ├── decorators/            # @Public, @Roles, @CurrentUser
│   └── interceptors/          # Response transformation
│
├── shared/                    # Reusable across features
│   ├── dto/                   # Common DTOs (pagination, responses)
│   └── types/                 # Enums, interfaces
│
└── features/                  # Feature modules
    ├── users/                 # User management & auth
    │   ├── controllers/
    │   ├── services/
    │   ├── entities/
    │   ├── dto/
    │   ├── strategies/        # Passport strategies
    │   └── guards/
    │
    ├── mail/                  # Email service
    │   ├── services/
    │   ├── providers/         # SMTP, SendGrid, Resend
    │   └── templates/
    │
    ├── storage/               # File storage
    │   ├── services/
    │   └── providers/         # S3, R2
    │
    └── health/                # Health checks
        └── controllers/
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis (optional, for email queue 'Bullmq')
- pnpm/npm/yarn

### Installation

```bash
# clone the repository
git clone https://github.com/yourusername/nestjs-template.git
cd nestjs-template

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
code .env
```

### Development

```bash
# Run migrations
npm run migration:run

# Start development server
npm run start:dev
```

The API will be available at `http://localhost:3000/api`

Swagger docs at `http://localhost:3000/api/docs`

### Production

```bash
# Build the application
npm run build

# Run in production
npm run start:prod
```

---

## Docker

### Development

```bash
docker-compose -f docker-compose.dev.yml up
```

### Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## API Endpoints

### Authentication

| Method | Endpoint                          | Description               | Auth      |
| ------ | --------------------------------- | ------------------------- | --------- |
| POST   | `/api/users/register`             | Register new user         | ❌ Public |
| POST   | `/api/users/login`                | Login with email/password | ❌ Public |
| GET    | `/api/users/auth/google`          | Start Google OAuth        | ❌ Public |
| GET    | `/api/users/auth/google/callback` | Google OAuth callback     | ❌ Public |
| POST   | `/api/users/forget-password`      | Request password reset    | ❌ Public |
| POST   | `/api/users/reset-password`       | Reset password with token | ❌ Public |

### Users

| Method | Endpoint                     | Description              | Auth     |
| ------ | ---------------------------- | ------------------------ | -------- |
| GET    | `/api/users/me`              | Get current user profile | ✅ JWT   |
| PATCH  | `/api/users/me`              | Update current user      | ✅ JWT   |
| PUT    | `/api/users/change-password` | Change password          | ✅ JWT   |
| DELETE | `/api/users/me`              | Delete account           | ✅ JWT   |
| GET    | `/api/users`                 | List all users           | ✅ Admin |

### Health

| Method | Endpoint      | Description  | Auth      |
| ------ | ------------- | ------------ | --------- |
| GET    | `/api/health` | Health check | ❌ Public |

---

## Authentication

### JWT Token

Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Public Routes

Use the `@Public()` decorator to make routes accessible without authentication:

```typescript
@Public()
@Get('public-route')
publicRoute() {
  return 'Anyone can access this';
}
```

### Role-Based Access

Use the `@Roles()` decorator to restrict access:

```typescript
@Roles(Role.ADMIN)
@Get('admin-only')
adminRoute() {
  return 'Only admins can access this';
}
```

---

## Email Service

The template supports multiple email providers with optional queue processing.

### Providers

- **SMTP** - Gmail, Outlook, Amazon SES, or any SMTP server -> Not recommended in production
- **SendGrid** - Transactional email service
- **Resend** - Modern email API

### Usage

```typescript
@Injectable()
export class MyService {
  constructor(private mailService: MailService) {}

  async sendEmail() {
    await this.mailService.send({
      to: 'user@example.com',
      subject: 'Hello',
      html: '<h1>Welcome!</h1>',
    });
  }
}
```

### Queue Mode

Enable `MAIL_QUEUE_ENABLED=true` for async processing via Redis/BullMQ.

---

## Storage Service

Upload files to AWS S3 or Cloudflare R2.

### Usage

```typescript
@Injectable()
export class MyService {
  constructor(private storageService: StorageService) {}

  async uploadFile(file: Buffer) {
    const result = await this.storageService.upload({
      key: 'uploads/image.jpg',
      body: file,
      contentType: 'image/jpeg',
    });
    return result.url;
  }
}
```

---

## Database Migrations

```bash
# Generate a new migration
npm run migration:generate src/core/database/migrations/MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

---

## Testing

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

---

## Scripts

| Script               | Description                          |
| -------------------- | ------------------------------------ |
| `start:dev`          | Start in development with hot reload |
| `start:prod`         | Start production build               |
| `build`              | Build the application                |
| `lint`               | Run ESLint                           |
| `format`             | Format with Prettier                 |
| `test`               | Run unit tests                       |
| `test:e2e`           | Run end-to-end tests                 |
| `migration:run`      | Run database migrations              |
| `migration:generate` | Generate new migration               |
| `migration:revert`   | Revert last migration                |

---

## Configuration

All configuration is done via environment variables. See:

- [.env.example](.env.example) - Example configuration
- [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) - Detailed documentation

---

## Documentation

| Document                                            | Description                     |
| --------------------------------------------------- | ------------------------------- |
| [ARCHITECTURE_GUIDE.md](docs/ARCHITECTURE_GUIDE.md) | Feature-based pattern explained |
| [ENVIRONMENT.md](docs/ENVIRONMENT.md)               | Environment variables reference |
| [MIGRATION_PLAN.md](MIGRATION_PLAN.md)              | Migration tracking              |

---

## Tech Stack

| Technology                                      | Purpose           |
| ----------------------------------------------- | ----------------- |
| [NestJS 11](https://nestjs.com/)                | Framework         |
| [TypeScript 5](https://www.typescriptlang.org/) | Language          |
| [TypeORM](https://typeorm.io/)                  | ORM               |
| [PostgreSQL](https://www.postgresql.org/)       | Database          |
| [Passport](http://www.passportjs.org/)          | Authentication    |
| [Zod](https://zod.dev/)                         | Validation        |
| [Swagger](https://swagger.io/)                  | API Documentation |
| [Pino](https://getpino.io/)                     | Logging           |
| [BullMQ](https://bullmq.io/)                    | Queue             |
| [Helmet](https://helmetjs.github.io/)           | Security          |

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [NestJS](https://nestjs.com/) for the amazing framework
- The open-source community for all the great packages

---

**Goodluck with your coding <3 !**
