import { Global, Module } from '@nestjs/common';

/**
 * CoreModule - Global module containing singleton services, guards, and interceptors
 *
 * This module is marked as @Global() and should only be imported once in AppModule.
 * It provides:
 * - Configuration services
 * - Database configuration
 * - Global guards (JWT, Roles)
 * - Global interceptors (Serialization)
 * - Global decorators
 *
 * Note: The actual providers are registered in AppModule using APP_GUARD.
 * This module primarily serves as an organizational container and barrel export.
 */
@Global()
@Module({
  imports: [],
  providers: [],
  exports: [],
})
export class CoreModule {}
