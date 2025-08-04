import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ApiAuthSchemeEnum, ISubscriberJwt, MemberRoleEnum } from '@novu/shared';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtSubscriberStrategy extends PassportStrategy(Strategy, 'subscriberJwt') {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: ISubscriberJwt) {
    const subscriber = await this.authService.validateSubscriber(payload);

    if (!subscriber) {
      throw new UnauthorizedException();
    }

    if (payload.aud !== 'widget_user') {
      throw new UnauthorizedException();
    }

    /*
     * TODO: Create a unified session interface for both users and subscribers to eliminate property naming inconsistencies (e.g., _environmentId vs environmentId)
     * for user we have UserSessionData, we need to create SubscriberSessionData
     */
    return {
      ...subscriber,
      organizationId: subscriber._organizationId,
      environmentId: subscriber._environmentId,
      scheme: ApiAuthSchemeEnum.BEARER,
    };
  }
}
