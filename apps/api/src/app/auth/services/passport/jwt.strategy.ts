import type http from 'http';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiAuthSchemeEnum, HttpRequestHeaderKeysEnum, UserSessionData } from '@novu/shared';
import { AuthService, Instrument } from '@novu/application-generic';
import { EnvironmentRepository } from '@novu/dal';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private environmentRepository: EnvironmentRepository
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
      passReqToCallback: true,
    });
  }
  @Instrument()
  async validate(req: http.IncomingMessage, session: UserSessionData) {
    // Set the scheme to Bearer, meaning the user is authenticated via a JWT coming from Dashboard
    // eslint-disable-next-line no-param-reassign
    session.scheme = ApiAuthSchemeEnum.BEARER;

    const user = await this.authService.validateUser(session);
    if (!user) {
      throw new UnauthorizedException();
    }

    await this.resolveEnvironmentId(req, session);

    return session;
  }

  @Instrument()
  async resolveEnvironmentId(req: http.IncomingMessage, session: UserSessionData) {
    const environmentIdFromHeader =
      (req.headers[HttpRequestHeaderKeysEnum.NOVU_ENVIRONMENT_ID.toLowerCase()] as string) || '';

    let currentEnvironmentId = '';

    const environments = await this.environmentRepository.findOrganizationEnvironments(session.organizationId);
    const environmentIds = environments.map((env) => env._id);
    const developmentEnvironmentId = environments.find((env) => env.name === 'Development')?._id || '';

    currentEnvironmentId = developmentEnvironmentId;

    if (environmentIds.includes(environmentIdFromHeader)) {
      currentEnvironmentId = environmentIdFromHeader;
    }

    // eslint-disable-next-line no-param-reassign
    session.environmentId = currentEnvironmentId;
  }
}
