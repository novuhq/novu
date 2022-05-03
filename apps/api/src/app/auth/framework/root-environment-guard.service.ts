import { CanActivate, ExecutionContext, forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IJwtPayload } from '@novu/shared';
import * as jwt from 'jsonwebtoken';
import { AuthService } from '../services/auth.service';

@Injectable()
export class RootEnvironmentGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(forwardRef(() => AuthService)) private authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    if (!request.headers.authorization) return false;

    const token = request.headers.authorization.split(' ')[1];
    if (!token) return false;

    const user = jwt.decode(token) as IJwtPayload;
    if (!user) return false;
    if (!user.environmentId) return false;

    const environment = await this.authService.isRootEnvironment(user);

    if (environment) {
      throw new UnauthorizedException('This action is only allowed in Development environment');
    }

    return true;
  }
}
