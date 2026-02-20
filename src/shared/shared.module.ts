import { Module } from '@nestjs/common';

/**
 * SharedModule - Contains reusable DTOs, types, and interfaces
 *
 * This module is NOT global - it must be explicitly imported by feature modules that need it.
 * It contains:
 * - Common DTOs (ApiResponse, PaginatedResponse, PaginationQuery)
 * - Shared types and enums (Role, AuthenticatedUser, etc.)
 * - Shared interfaces
 *
 * Note: This module doesn't provide services, only type definitions and DTOs.
 */
@Module({
  imports: [],
  providers: [],
  exports: [],
})
export class SharedModule {}
