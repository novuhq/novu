import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard, IAuthModuleOptions } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';
import { IJwtPayload } from '@novu/shared';

@Injectable()
export class JwtAuthGuard extends AuthGuard(['jwt', 'headerapikey']) {
  private readonly reflector: Reflector;

  constructor(private logger: PinoLogger) {
    super();
    this.reflector = new Reflector();
  }

  getAuthenticateOptions(context: ExecutionContext): IAuthModuleOptions<any> {
    const request = context.switchToHttp().getRequest();
    const authorizationHeader = request.headers.authorization;

    const authScheme = authorizationHeader?.split(' ')[0] || 'None';
    request.authScheme = authScheme;
    this.logger.assign({ authScheme });

    switch (authScheme) {
      case 'Bearer':
        return {
          session: false,
          defaultStrategy: 'jwt',
        };
      case 'ApiKey':
        const apiEnabled = this.reflector.get<boolean>(
          'external_api_accessible',
          context.getHandler()
        );
        if (!apiEnabled)
          throw new UnauthorizedException('API endpoint not available');

        return {
          session: false,
          defaultStrategy: 'headerapikey',
        };
      default:
        throw new UnauthorizedException(
          `Invalid authentication scheme: "${authScheme}"`
        );
    }
  }

  handleRequest<TUser = IJwtPayload>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any
  ): TUser {
    this.logger.assign({
      userId: user._id,
      environmentId: user.environmentId,
      organizationId: user.organizationId,
    });

    /**
     * This helps with sentry and other tools that need to know who the user is based on `id` property.
     */
    user.id = user._id;
    user.username = (user.firstName || '').trim();
    user.domain = user.email?.split('@')[1];

    return user;
  }
}
