import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IJwtPayload } from '@novu/shared';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    if (!request.headers.authorization) return false;

    const token = request.headers.authorization.split(' ')[1];
    if (!token) return false;

    const authorizationHeader = request.headers.authorization;
    if (!authorizationHeader?.includes('ApiKey')) {
      const user = jwt.decode(token) as IJwtPayload;
      if (!user) return false;
    }

    /*
     * TODO: The roles check implementation is currently not enabled
     * As we are not using roles in the system at this point
     */

    return true;
  }
}
