import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard, IAuthModuleOptions } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import {
  ApiAuthSchemeEnum,
  IJwtPayload,
  PassportStrategyEnum,
} from '@novu/shared';
import { Instrument } from '../../instrumentation';
import { Observable } from 'rxjs';

type SentryUser = {
  id: string;
  username: string;
  domain: string;
};
type HandledUser = (IJwtPayload & SentryUser) | false;

const NONE_AUTH_SCHEME = 'None';

@Injectable()
export class UserAuthGuard extends AuthGuard([
  PassportStrategyEnum.JWT,
  PassportStrategyEnum.HEADER_API_KEY,
]) {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  @Instrument()
  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext): IAuthModuleOptions<any> {
    const request = context.switchToHttp().getRequest();
    const authorizationHeader = request.headers.authorization;

    const authScheme = authorizationHeader?.split(' ')[0] || NONE_AUTH_SCHEME;
    request.authScheme = authScheme;

    switch (authScheme) {
      case ApiAuthSchemeEnum.BEARER:
        return {
          session: false,
          defaultStrategy: PassportStrategyEnum.JWT,
        };
      case ApiAuthSchemeEnum.API_KEY:
        const apiEnabled = this.reflector.get<boolean>(
          'external_api_accessible',
          context.getHandler()
        );
        if (!apiEnabled)
          throw new UnauthorizedException('API endpoint not available');

        return {
          session: false,
          defaultStrategy: PassportStrategyEnum.HEADER_API_KEY,
        };
      case NONE_AUTH_SCHEME:
        throw new UnauthorizedException('Missing authorization header');
      default:
        throw new UnauthorizedException(
          `Invalid authentication scheme: "${authScheme}"`
        );
    }
  }

  handleRequest<TUser = IJwtPayload>(
    err: any,
    user: IJwtPayload | false,
    info: any,
    context: ExecutionContext,
    status?: any
  ): TUser {
    let handledUser: HandledUser;
    if (typeof user === 'object') {
      /**
       * This helps with sentry and other tools that need to know who the user is based on `id` property.
       */
      handledUser = {
        ...user,
        id: user._id,
        username: (user.firstName || '').trim(),
        domain: user.email?.split('@')[1],
      };
    } else {
      handledUser = user;
    }

    return super.handleRequest(err, handledUser, info, context, status);
  }
}
