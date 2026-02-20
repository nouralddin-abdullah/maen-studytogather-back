import { SetMetadata } from '@nestjs/common';
import { Role } from '@shared/types/roles.enum';

export const ROLES_KEY = 'roles';

// decorator to specify which roles can access a route
// Usage: @Roles(Role.ADMIN) or @Roles(Role.ADMIN, Role.MODERATOR) -> multi roles
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
