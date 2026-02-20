# NestJS Feature-Based Architecture Guide

> A comprehensive guide to understanding the feature-based pattern, modules, providers, and how everything connects in NestJS.

---

## Table of Contents

1. [What is the Feature-Based Pattern?](#what-is-the-feature-based-pattern)
2. [Understanding NestJS Modules](#understanding-nestjs-modules)
3. [Providers & Dependency Injection](#providers--dependency-injection)
4. [Imports & Exports](#imports--exports)
5. [Our Project Structure Explained](#our-project-structure-explained)
6. [Core vs Shared vs Features](#core-vs-shared-vs-features)
7. [How Data Flows Through the App](#how-data-flows-through-the-app)
8. [Common Patterns & Examples](#common-patterns--examples)
9. [Quick Reference Cheat Sheet](#quick-reference-cheat-sheet)

---

## What is the Feature-Based Pattern?

### The Problem with Flat Structure

Imagine organizing clothes by type across your whole house:

- All shirts in the living room
- All pants in the kitchen
- All socks in the bathroom

That's confusing, right? That's what a **flat structure** looks like:

```
src/
├── controllers/
│   ├── users.controller.ts
│   ├── products.controller.ts
│   └── orders.controller.ts
├── services/
│   ├── users.service.ts
│   ├── products.service.ts
│   └── orders.service.ts
├── entities/
│   ├── user.entity.ts
│   ├── product.entity.ts
│   └── order.entity.ts
```

### The Feature-Based Solution

Now imagine organizing by person's closet - everything they need is together:

```
src/features/
├── users/           # Everything about users in ONE place
│   ├── controllers/
│   ├── services/
│   ├── entities/
│   └── dto/
├── products/        # Everything about products in ONE place
│   ├── controllers/
│   ├── services/
│   ├── entities/
│   └── dto/
```

### Benefits

| Benefit            | Explanation                                     |
| ------------------ | ----------------------------------------------- |
| **Easy to Find**   | Need to fix user login? Go to `features/users/` |
| **Easy to Delete** | Want to remove a feature? Delete one folder     |
| **Easy to Test**   | Each feature is isolated and testable           |
| **Team Friendly**  | Different devs can work on different features   |
| **Scalable**       | Add new features without touching existing ones |

---

## Understanding NestJS Modules

### What is a Module?

A **Module** is like a container that groups related code together. Think of it as a box with a label.

```typescript
@Module({
  imports: [], // Other modules this module needs
  controllers: [], // Handle HTTP requests (routes)
  providers: [], // Services, repositories, helpers
  exports: [], // What other modules can use from this module
})
export class UsersModule {}
```

### Visual Representation

```
┌─────────────────────────────────────────────┐
│              UsersModule                     │
│                                              │
│  ┌──────────────┐    ┌──────────────┐       │
│  │  Controller  │───▶│   Service    │       │
│  │  (Routes)    │    │  (Logic)     │       │
│  └──────────────┘    └──────────────┘       │
│                             │                │
│                             ▼                │
│                      ┌──────────────┐       │
│                      │   Entity     │       │
│                      │  (Database)  │       │
│                      └──────────────┘       │
└─────────────────────────────────────────────┘
```

### The @Module() Decorator Explained

```typescript
@Module({
  // 1. IMPORTS - "I need to use stuff from these other modules"
  imports: [
    TypeOrmModule.forFeature([User]), // Database access for User
    JwtModule, // JWT functionality
  ],

  // 2. CONTROLLERS - "These handle incoming HTTP requests"
  controllers: [
    UsersController, // Handles /users routes
  ],

  // 3. PROVIDERS - "These are my services and helpers"
  providers: [
    UsersService, // Business logic for users
    AuthService, // Authentication logic
  ],

  // 4. EXPORTS - "Other modules can use these from me"
  exports: [
    UsersService, // Other modules can inject UsersService
  ],
})
export class UsersModule {}
```

---

## Providers & Dependency Injection

### What is a Provider?

A **Provider** is anything that can be injected into other classes. Usually services.

```typescript
// This is a provider (a service)
@Injectable()
export class UsersService {
  findAll() {
    return 'All users';
  }
}
```

### What is Dependency Injection (DI)?

Instead of creating objects yourself, NestJS creates and gives them to you.

**Without DI (the old way):**

```typescript
class UsersController {
  private usersService: UsersService;

  constructor() {
    // YOU create the service - bad!
    this.usersService = new UsersService();
  }
}
```

**With DI (the NestJS way):**

```typescript
@Controller('users')
export class UsersController {
  constructor(
    // NestJS GIVES you the service - good!
    private readonly usersService: UsersService,
  ) {}
}
```

### Why is DI Better?

| Without DI         | With DI                     |
| ------------------ | --------------------------- |
| Hard to test       | Easy to mock for tests      |
| Tightly coupled    | Loosely coupled             |
| Multiple instances | Single instance (singleton) |
| Manual management  | Automatic lifecycle         |

### Visual: How DI Works

```
1. You register providers in module:
   @Module({ providers: [UsersService] })

2. NestJS creates a container:
   ┌─────────────────────────┐
   │    NestJS Container     │
   │  ┌───────────────────┐  │
   │  │   UsersService    │  │
   │  │   (one instance)  │  │
   │  └───────────────────┘  │
   └─────────────────────────┘

3. When you ask for it in constructor:
   constructor(private usersService: UsersService)

4. NestJS gives you the SAME instance everywhere
```

---

## Imports & Exports

### The Visibility Problem

By default, what's inside a module stays inside that module.

```typescript
// mail.module.ts
@Module({
  providers: [MailService], // MailService is PRIVATE to this module
})
export class MailModule {}

// users.module.ts
@Module({
  imports: [MailModule],
  providers: [UsersService],
})
export class UsersModule {}

// users.service.ts
@Injectable()
export class UsersService {
  constructor(
    private mailService: MailService, // ERROR! MailService not exported
  ) {}
}
```

### The Solution: Exports

```typescript
// mail.module.ts
@Module({
  providers: [MailService],
  exports: [MailService], // Now other modules can use it!
})
export class MailModule {}
```

### Import/Export Flow

```
┌──────────────────┐          ┌──────────────────┐
│    MailModule    │          │   UsersModule    │
│                  │          │                  │
│  MailService ────┼── exports ─────┐           │
│                  │          │      │  imports  │
└──────────────────┘          │      ▼           │
                              │  MailService     │
                              │  (now available) │
                              └──────────────────┘
```

### @Global() Modules

Some modules should be available everywhere without importing them every time.

```typescript
@Global() // ✨ Available everywhere!
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class CoreModule {}
```

**When to use @Global():**

- Configuration
- Database connections
- Logging
- Authentication guards

**When NOT to use @Global():**

- Feature-specific services
- Most business logic

---

## Our Project Structure Explained

### The Three Layers

```
src/
├── core/       # 🔧 GLOBAL stuff (use everywhere, import once)
├── shared/     # 📦 REUSABLE stuff (import where needed)
└── features/   # 🚀 FEATURE stuff (self-contained modules)
```

### Layer 1: Core Module

**Purpose:** Things needed across the ENTIRE app, imported ONCE in AppModule.

```
core/
├── core.module.ts      # @Global() module
├── config/             # Environment variables
│   └── secrets.ts
├── database/           # Database connection
│   └── data-source.ts
├── guards/             # Global auth guards
│   ├── jwt-auth.guard.ts
│   └── roles.guard.ts
├── decorators/         # Custom decorators
│   ├── @Public()
│   ├── @Roles()
│   └── @CurrentUser()
└── interceptors/       # Request/response transformers
```

**Example - CoreModule:**

```typescript
@Global() // Makes everything available app-wide
@Module({
  providers: [
    // These are available everywhere
  ],
  exports: [
    // No need to import CoreModule in other modules
  ],
})
export class CoreModule {}
```

### Layer 2: Shared Module

**Purpose:** Reusable code that features IMPORT when they need it.

```
shared/
├── shared.module.ts    # NOT global
├── dto/                # Common DTOs
│   ├── api-response.dto.ts
│   ├── pagination-query.dto.ts
│   └── paginated-response.dto.ts
└── types/              # Common types
    ├── roles.enum.ts
    └── auth.types.ts
```

**Example - Using Shared Types:**

```typescript
// In any feature
import { Role } from '@shared/types';
import { PaginationQueryDto } from '@shared/dto';
```

### Layer 3: Feature Modules

**Purpose:** Self-contained business features.

```
features/
├── users/              # User management feature
│   ├── users.module.ts
│   ├── controllers/    # HTTP routes
│   ├── services/       # Business logic
│   ├── entities/       # Database models
│   ├── dto/            # Data validation
│   ├── strategies/     # Passport strategies
│   ├── guards/         # Feature-specific guards
│   └── swagger/        # API documentation
│
├── mail/               # Email feature
│   ├── mail.module.ts
│   ├── services/
│   ├── providers/      # SMTP, SendGrid, etc.
│   └── templates/
│
├── storage/            # File storage feature
│   ├── storage.module.ts
│   ├── services/
│   └── providers/      # S3, R2, etc.
│
└── health/             # Health checks feature
    ├── health.module.ts
    └── controllers/
```

---

## Core vs Shared vs Features

### Decision Tree

```
                        Is this code needed?
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        Everywhere?    In some places?    One feature?
              │               │               │
              ▼               ▼               ▼
           CORE           SHARED          FEATURE
        (Global)        (Import it)     (Keep local)
```

### Examples

| Code                  | Location                 | Why?                          |
| --------------------- | ------------------------ | ----------------------------- |
| JWT Guard             | `core/guards/`           | Needed on almost every route  |
| `@Public()` decorator | `core/decorators/`       | Used across many features     |
| `PaginationDto`       | `shared/dto/`            | Many features need pagination |
| `Role` enum           | `shared/types/`          | Used in users and guards      |
| `UsersService`        | `features/users/`        | Only users feature uses it    |
| `MailService`         | `features/mail/`         | Specific to email sending     |
| `LocalAuthGuard`      | `features/users/guards/` | Only used for login route     |

### Module Dependencies

```
┌─────────────────────────────────────────────────────────┐
│                       AppModule                          │
│                           │                              │
│              ┌────────────┼────────────┐                │
│              ▼            ▼            ▼                │
│         CoreModule   SharedModule   Features            │
│         (@Global)                                       │
│              │                         │                │
│              ▼                         ▼                │
│    ┌─────────────────┐    ┌───────────────────────┐    │
│    │ • JwtAuthGuard  │    │ UsersModule           │    │
│    │ • RolesGuard    │    │   └── imports: [      │    │
│    │ • @Public       │    │        TypeOrmModule, │    │
│    │ • @Roles        │    │        JwtModule,     │    │
│    │ • Secrets       │    │        MailModule     │    │
│    └─────────────────┘    │      ]                │    │
│                           └───────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## How Data Flows Through the App

### Request Lifecycle

```
HTTP Request: POST /api/users/register
         │
         ▼
┌─────────────────┐
│   Middleware    │  (Helmet, CORS, Logger)
└────────┬────────┘
         ▼
┌─────────────────┐
│     Guards      │  (JwtAuthGuard checks @Public)
└────────┬────────┘
         ▼
┌─────────────────┐
│  Interceptors   │  (Before - logging, timing)
└────────┬────────┘
         ▼
┌─────────────────┐
│     Pipes       │  (Validation - ZodValidationPipe)
└────────┬────────┘
         ▼
┌─────────────────────────────────────────────┐
│              UsersController                 │
│                                              │
│  @Post('register')                          │
│  async register(@Body() dto: CreateUserDto) │
│      │                                       │
│      ▼                                       │
│  ┌─────────────────┐                        │
│  │  UsersService   │                        │
│  │    .create()    │                        │
│  └────────┬────────┘                        │
│           │                                  │
│           ▼                                  │
│  ┌─────────────────┐   ┌─────────────────┐  │
│  │   Repository    │   │   MailService   │  │
│  │   .save(user)   │   │  .sendWelcome() │  │
│  └─────────────────┘   └─────────────────┘  │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Interceptors   │  (After - transform response)
└────────┬────────┘
         ▼
HTTP Response: { id: 1, email: "user@example.com" }
```

### Example: User Registration Flow

```typescript
// 1. Request hits controller
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Public() // Skip JWT check (from core/decorators)
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    // 2. Controller calls service
    return this.usersService.create(createUserDto);
  }
}

// 3. Service handles business logic
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private mailService: MailService, // From mail feature
  ) {}

  async create(dto: CreateUserDto) {
    // 4. Save to database
    const user = await this.userRepository.save(dto);

    // 5. Send welcome email
    await this.mailService.sendWelcomeEmail(user.email);

    return user;
  }
}
```

---

## Common Patterns & Examples

### Pattern 1: Barrel Exports (index.ts)

Every folder has an `index.ts` that exports everything:

```typescript
// features/users/services/index.ts
export * from './users.service';
export * from './auth.service';

// Now you can import like this:
import { UsersService, AuthService } from './services';
// Instead of:
import { UsersService } from './services/users.service';
import { AuthService } from './services/auth.service';
```

### Pattern 2: Dynamic Modules

For modules that need configuration:

```typescript
// mail.module.ts
@Module({})
export class MailModule {
  static forRoot(config: MailConfig): DynamicModule {
    return {
      module: MailModule,
      providers: [{ provide: 'MAIL_CONFIG', useValue: config }, MailService],
      exports: [MailService],
    };
  }

  static forRootAsync(options: AsyncOptions): DynamicModule {
    return {
      module: MailModule,
      imports: options.imports,
      providers: [
        {
          provide: 'MAIL_CONFIG',
          useFactory: options.useFactory,
          inject: options.inject,
        },
        MailService,
      ],
      exports: [MailService],
    };
  }
}

// app.module.ts - Usage
@Module({
  imports: [
    MailModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        provider: config.get('MAIL_PROVIDER'),
        // ...
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Pattern 3: Custom Injection Tokens

When you have multiple implementations of the same interface:

```typescript
// constants/storage.constants.ts
export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

// storage.module.ts
@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useFactory: (config) => {
        if (config.provider === 's3') return new S3Provider(config);
        if (config.provider === 'r2') return new R2Provider(config);
      },
      inject: ['STORAGE_CONFIG'],
    },
  ],
})
// storage.service.ts
@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_PROVIDER) // Use the token
    private provider: IStorageProvider,
  ) {}
}
```

### Pattern 4: Feature Module Template

Use this as a starting point for new features:

```typescript
// features/[feature-name]/[feature-name].module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FeatureController } from './controllers/feature.controller';
import { FeatureService } from './services/feature.service';
import { FeatureEntity } from './entities/feature.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([FeatureEntity]),
    // Other modules this feature needs
  ],
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService], // If other features need it
})
export class FeatureModule {}
```

---

## Quick Reference Cheat Sheet

### Module Decorator

```typescript
@Module({
  imports: [],      // Modules I need
  controllers: [],  // My route handlers
  providers: [],    // My services
  exports: [],      // What I share with others
})
```

### Common Decorators

| Decorator       | Purpose                     | Location          |
| --------------- | --------------------------- | ----------------- |
| `@Module()`     | Define a module             | Class             |
| `@Controller()` | Define routes               | Class             |
| `@Injectable()` | Make class injectable       | Class             |
| `@Inject()`     | Inject custom token         | Constructor param |
| `@Global()`     | Module available everywhere | Class             |

### Import Paths

```typescript
// From Core (global, no import needed in module)
import { Public, Roles, CurrentUser } from '@core/decorators';
import { JwtAuthGuard, RolesGuard } from '@core/guards';
import { secrets } from '@core/config';

// From Shared (import SharedModule if needed)
import { Role } from '@shared/types';
import { ApiResponseDto, PaginationQueryDto } from '@shared/dto';

// From Features
import { UsersService } from '@features/users';
import { MailService } from '@features/mail';
import { StorageService } from '@features/storage';
```

### When to Use What

| Situation                       | Solution                             |
| ------------------------------- | ------------------------------------ |
| Need a service in one feature   | Put it in that feature's `services/` |
| Need a service in many features | Put in `shared/` and export it       |
| Need a service everywhere       | Put in `core/` with `@Global()`      |
| Need to switch implementations  | Use injection tokens                 |
| Need runtime configuration      | Use dynamic modules                  |

---

## Still Confused?

### Quick Analogy

Think of your app as a company:

- **Core** = Building infrastructure (electricity, plumbing, security)
  - Everyone uses it, you set it up once
- **Shared** = Office supplies room (paper, pens, staplers)
  - Available to all, but you must go get them
- **Features** = Departments (Sales, HR, Engineering)
  - Each has their own space, tools, and responsibilities
  - They can share resources but work independently

### Key Takeaways

1. **Modules group related code** - Think of them as folders with superpowers
2. **Providers are services** - NestJS creates and manages them for you
3. **Imports bring in other modules** - Like #include or require
4. **Exports share your providers** - Make them available to whoever imports you
5. **@Global() means import once** - Available everywhere automatically

---

_Need more help? Check the [NestJS Documentation](https://docs.nestjs.com/modules)_
