import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const roleFromToken = request.user?.role;
    const roleFromHeader = request.headers['x-user-role'];
    const role = String(roleFromToken ?? roleFromHeader ?? '').toLowerCase();

    if (!role) {
      throw new ForbiddenException('Role is required for this operation');
    }

    const allowed = requiredRoles.map((r) => r.toLowerCase()).includes(role);
    if (!allowed) {
      throw new ForbiddenException('Insufficient role for this operation');
    }

    return true;
  }
}
