/**
 * Features barrel export
 *
 * NOTE: Do NOT re-export all feature modules from here.
 * Feature modules have cross-dependencies (e.g. users → storage, users → mail)
 * and re-exporting them all from a single barrel creates circular resolution chains.
 *
 * Instead, import directly from the specific feature:
 *   import { StorageService } from '@features/storage';
 *   import { MailService } from '@features/mail';
 *   import { UsersModule } from '@features/users';
 *   import { HealthModule } from '@features/health';
 */
export { UsersModule } from './users/users.module.js';
export { HealthModule } from './health/health.module.js';
export { MailModule } from './mail/mail.module.js';
export { StorageModule } from './storage/storage.module.js';
