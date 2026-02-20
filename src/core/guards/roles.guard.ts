import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role, hasRolePermission } from '@shared/types/roles.enum';
import { AuthenticatedUser } from '@shared/types/auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // get the allowed roles form deco
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // no @Roles decorator = no role restriction but still need auth (to no auth just use @public)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // get user from request (populated by JwtStrategy)
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    if (!user || !user.role) {
      return false;
    }

    // check if user's role are in ANY of the required roles (using hierarchy)
    // example: @Roles(Role.MODERATOR) - NOTE THAT ADMIN can also access because ADMIN > MODERATOR
    return requiredRoles.some((requiredRole) =>
      hasRolePermission(user.role, requiredRole),
    );
  }
}
