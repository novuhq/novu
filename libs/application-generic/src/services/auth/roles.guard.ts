import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserSessionData } from '@novu/shared';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());

    if (!roles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;

    return this.hasRequiredRole(user, roles);
  }

  private hasRequiredRole(user: UserSessionData, roles: string[]): boolean {
    return roles.some((role) => user.roles.includes(role));
  }
}
