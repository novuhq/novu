import { timingSafeEqual } from 'node:crypto';
import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ISubscriberJwt } from '@novu/shared';
import jwt from 'jsonwebtoken';
import { getRequestHeaderValue } from '../shared/helpers/get-request-header-value';
import { SUBSCRIBER_JWT_STATELESS_STRATEGY, toStatelessSubscriberSession } from './subscriber-jwt-stateless.strategy';

export const INTERNAL_SERVICES_KEY_HEADER = 'x-novu-internal-key';

/**
 * Presence reports name the subscriber with its session JWT. A socket server holding the internal services key may
 * send a session that already expired: it closes sockets at expiry and reports them offline afterwards. Everyone
 * else needs a session that is still valid.
 */
@Injectable()
export class SubscriberPresenceAuthGuard extends AuthGuard(SUBSCRIBER_JWT_STATELESS_STRATEGY) {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    if (!carriesInternalServicesKey(request.headers)) {
      return super.canActivate(context);
    }

    const [scheme, token] = (getRequestHeaderValue(request.headers.authorization) ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException();
    }

    let payload: ISubscriberJwt;
    try {
      payload = jwt.verify(token, `${process.env.JWT_SECRET}`, { ignoreExpiration: true }) as ISubscriberJwt;
    } catch {
      throw new UnauthorizedException();
    }

    request.user = toStatelessSubscriberSession(payload);

    return true;
  }
}

function carriesInternalServicesKey(headers: Record<string, string | string[] | undefined>): boolean {
  const expected = process.env.INTERNAL_SERVICES_API_KEY;
  const provided = getRequestHeaderValue(headers[INTERNAL_SERVICES_KEY_HEADER]);
  if (!expected || !provided) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}
