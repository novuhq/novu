import type http from 'http';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UserSessionData } from '@novu/shared';
import { AuthService, Instrument } from '@novu/application-generic';
import { HttpRequestHeaderKeysEnum } from '../../../shared/framework/types';
import { env } from 'process';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
      passReqToCallback: true,
    });
  }

  @Instrument()
  async validate(req: http.IncomingMessage, payload: UserSessionData) {
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException();
    }

    const headerKey = HttpRequestHeaderKeysEnum.NOVU_ENVIRONMENT_ID.toLowerCase();
    const environmentId = req.headers[HttpRequestHeaderKeysEnum.NOVU_ENVIRONMENT_ID.toLowerCase()];

    if (!environmentId) {
      throw new BadRequestException('Missing environment id', {
        cause: 'missing_environment_id',
        description: `Missing environment id in ${headerKey} header`,
      });
    }
  }
}
