import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard, AuthGuardAuthenticateOptions } from '@nestjs/passport';
import { PinoLogger } from '@novu/application-generic';
import { ApiAuthSchemeEnum, NONE_AUTH_SCHEME, PassportStrategyEnum } from '@novu/shared';

@Injectable()
export class CommunityUserAuthGuard extends AuthGuard([PassportStrategyEnum.JWT, PassportStrategyEnum.HEADER_API_KEY]) {
  constructor(
    private readonly reflector: Reflector,
    private readonly logger: PinoLogger
  ) {
    super();
    this.logger.setContext(this.constructor.name);
  }

  getAuthenticateOptions(context: ExecutionContext): AuthGuardAuthenticateOptions {
    const request = context.switchToHttp().getRequest();
    const authorizationHeader = request.headers.authorization;

    const authScheme = authorizationHeader?.split(' ')[0] || NONE_AUTH_SCHEME;
    request.authScheme = authScheme;

    this.logger.assign({ authScheme });

    /*
     * The strategies come from the AuthGuard([...]) list above, which passport tries in order.
     * A `defaultStrategy` returned here was never read when that list is set, and
     * @nestjs/passport 12 no longer allows it in these options.
     */
    switch (authScheme) {
      case ApiAuthSchemeEnum.BEARER: {
        return { session: false };
      }
      case ApiAuthSchemeEnum.API_KEY: {
        const apiEnabled = this.reflector.get<boolean>('external_api_accessible', context.getHandler());
        if (!apiEnabled) throw new UnauthorizedException('API endpoint not accessible');

        return { session: false };
      }
      case NONE_AUTH_SCHEME:
        throw new UnauthorizedException('Missing authorization header');
      default:
        throw new UnauthorizedException(`Invalid authentication scheme: "${authScheme}"`);
    }
  }
}
