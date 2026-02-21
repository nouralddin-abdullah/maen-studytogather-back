import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { LoggerModule } from 'nestjs-pino';

// Core module
import { CoreModule } from './core/core.module';
import { JwtAuthGuard } from './core/guards/jwt-auth.guard';
import { RolesGuard } from './core/guards/roles.guard';

// Feature modules
import { UsersModule } from './features/users/users.module';
import { HealthModule } from './features/health/health.module';
import { StorageModule, StorageProviderType } from './features/storage';
import { MailModule, MailProviderType } from './features/mail';

// App components
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RoomsModule } from '@features/rooms/rooms.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    // Core module - provides global guards, decorators, database, config
    CoreModule,
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true, // avaliable everywhere you don't have to add it to each module
      envFilePath: '.env',
    }),

    // rate limiting - 10 requests per 60 seconds by default (can be changed from ENV)
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: configService.get<number>('THROTTLE_TTL', 60) * 1000,
            limit: configService.get<number>('THROTTLE_LIMIT', 10),
          },
        ],
      }),
      inject: [ConfigService],
    }),

    // pino logger
    // for dev it will do pretty logging and colorized for better debugging
    // for production it will use JSON and only informational data
    // auto logging for logging every req and response
    // replace the sensitive data like auth/cookies with [Redacted]
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          transport:
            configService.get('NODE_ENV') !== 'production'
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                  },
                }
              : undefined,
          level:
            configService.get('NODE_ENV') !== 'production' ? 'debug' : 'info',
          autoLogging: true,
          // redact sensitive data
          redact: ['req.headers.authorization', 'req.headers.cookie'],
        },
      }),
      inject: [ConfigService],
    }),

    // database (PostgreSQL)
    // in development: synchronize=true (auto-creates tables from entities)
    // in production: synchronize=false (use migrations instead)
    // run migrations with: npm run migration:run
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'nestjs_db'),
        autoLoadEntities: true,
        synchronize: configService.get('NODE_ENV') !== 'production',
        migrations: ['dist/core/database/migrations/*.js'],
        migrationsRun: configService.get('NODE_ENV') === 'production',
      }),
      inject: [ConfigService],
    }),

    // cloud storage (S3/R2)
    // set STORAGE_PROVIDER to 's3' or 'r2' in your .env file
    StorageModule.forRootAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        provider:
          (configService.get<string>(
            'STORAGE_PROVIDER',
          ) as StorageProviderType) || StorageProviderType.S3,
        endpoint: configService.get<string>('STORAGE_ENDPOINT'),
        region: configService.get<string>('STORAGE_REGION') || 'us-east-1',
        accessKeyId: configService.get<string>('STORAGE_ACCESS_KEY') || '',
        secretAccessKey: configService.get<string>('STORAGE_SECRET_KEY') || '',
        bucket: configService.get<string>('STORAGE_BUCKET') || '',
        publicUrl: configService.get<string>('STORAGE_PUBLIC_URL'),
      }),
      inject: [ConfigService],
    }),

    // Email service
    // queue is auto-enabled based on MAIL_QUEUE_ENABLED env var
    // when enabled, requires REDIS_HOST, REDIS_PORT, REDIS_PASSWORD (optional)
    MailModule.forRootAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        provider:
          (configService.get<string>('MAIL_PROVIDER') as MailProviderType) ||
          MailProviderType.SMTP,
        from: configService.get<string>('MAIL_FROM', 'noreply@example.com'),
        smtp: {
          host: configService.get<string>('SMTP_HOST', 'localhost'),
          port: configService.get<number>('SMTP_PORT', 587),
          secure: configService.get<boolean>('SMTP_SECURE', false),
          auth: {
            user: configService.get<string>('SMTP_USER', ''),
            pass: configService.get<string>('SMTP_PASS', ''),
          },
        },
        sendgrid: {
          apiKey: configService.get<string>('SENDGRID_API_KEY', ''),
        },
        resend: {
          apiKey: configService.get<string>('RESEND_API_KEY', ''),
        },
        queue: {
          enabled: configService.get<string>('MAIL_QUEUE_ENABLED') === 'true',
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        },
      }),
      inject: [ConfigService],
    }),

    PassportModule,
    UsersModule,
    RoomsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // global auth guard
    // use @Public() decorator to make routes public if you want
    // it depends on your website logic if it's free acces mostly
    // or mostly a must login to access
    // just remove the provider APP_GUARD To remove the global guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // global RBAC guard - use @Roles(Role.ADMIN) decorator to restrict routes
    // runs after JwtAuthGuard, checks role from JWT payload
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
