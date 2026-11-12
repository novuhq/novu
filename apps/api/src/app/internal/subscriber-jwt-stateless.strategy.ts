import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ISubscriberJwt } from '@novu/shared';
import { ExtractJwt, Strategy } from 'passport-jwt';

export const SUBSCRIBER_JWT_STATELESS_STRATEGY = 'subscriberJwtStateless';

export interface StatelessSubscriberSession {
  subscriberId: string;
  _environmentId: string;
  _organizationId: string;
}

/**
 * Verifies the subscriber JWT signature, expiry and audience without loading the subscriber.
 * Use only on endpoints whose writes are already scoped by the token's subscriberId and environmentId,
 * so a token for a deleted subscriber matches nothing instead of needing a lookup to reject it.
 */
@Injectable()
export class SubscriberJwtStatelessStrategy extends PassportStrategy(Strategy, SUBSCRIBER_JWT_STATELESS_STRATEGY) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  validate(payload: ISubscriberJwt): StatelessSubscriberSession {
    if (payload.aud !== 'widget_user' || !payload.subscriberId || !payload.environmentId) {
      throw new UnauthorizedException();
    }

    return {
      subscriberId: payload.subscriberId,
      _environmentId: payload.environmentId,
      _organizationId: payload.organizationId,
    };
  }
}
