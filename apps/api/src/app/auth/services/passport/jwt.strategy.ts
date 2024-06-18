import type http from 'http';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiAuthSchemeEnum, HttpRequestHeaderKeysEnum, UserSessionData } from '@novu/shared';
import { AuthService, Instrument } from '@novu/application-generic';

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
  async validate(req: http.IncomingMessage, session: UserSessionData) {
    // Set the scheme to Bearer, meaning the user is authenticated via a JWT coming from Dashboard
    session.scheme = ApiAuthSchemeEnum.BEARER;

    // Fetch the environmentId from the request header
    const environmentIdFromHeader =
      (req.headers[HttpRequestHeaderKeysEnum.NOVU_ENVIRONMENT_ID.toLowerCase()] as string) || '';

    /*
     * Ensure backwards compatibility with existing JWTs that contain environmentId
     * or cached SPA versions of Dashboard as there is no guarantee all current users
     * will have environmentId in localStorage instantly after the deployment.
     */
    session.environmentId = session.environmentId || environmentIdFromHeader;

    const user = await this.authService.validateUser(session);
    if (!user) {
      throw new UnauthorizedException();
    }

    return session;
  }
}
