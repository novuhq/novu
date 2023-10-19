import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IJwtPayload } from '@novu/shared';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());

    if (!roles || roles.length === 0) {
      // If no roles are specified, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Unauthorized');
    }
     /*
     * TODO: The roles check implementation is currently not enabled
     * As we are not using roles in the system at this point
     */
    const token = authorizationHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    const user = jwt.decode(token) as IJwtPayload;

    if (!user || !user.roles || !this.checkRoles(user.roles, roles)) {
      throw new UnauthorizedException('Unauthorized');
    }

    return true;
  }

  private checkRoles(userRoles: string[], requiredRoles: string[]): boolean {
    // Check if the user has any of the required roles
    return requiredRoles.some(role => userRoles.includes(role));
  }
}
