import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ISubscriberJwt } from '@novu/shared';
import jwt from 'jsonwebtoken';
import { PinoLogger } from '@novu/application-generic';

@Injectable()
export class SubscriberRouteGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly logger: PinoLogger
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const subscriberRouteGuard = this.reflector.get<string[]>('subscriberRouteGuard', context.getHandler());
    if (!subscriberRouteGuard) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    if (!request.headers.authorization) return false;

    const token = request.headers.authorization.split(' ')[1];
    if (!token) return false;

    const tokenContent = jwt.decode(token) as ISubscriberJwt;
    if (!tokenContent) return false;
    if (tokenContent.aud !== 'widget_user') return false;
    if (!tokenContent.environmentId) return false;

    this.logger.assign({ user: tokenContent });

    return true;
  }
}
