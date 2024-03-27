import { CanActivate, ExecutionContext, forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IJwtPayload } from '@novu/shared';
import * as jwt from 'jsonwebtoken';
import { AuthService } from '@novu/application-generic';

@Injectable()
export class RootEnvironmentGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(forwardRef(() => AuthService)) private authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const environment = await this.authService.isRootEnvironment(user);

    if (environment) {
      throw new UnauthorizedException('This action is only allowed in Development environment');
    }

    return true;
  }
}
