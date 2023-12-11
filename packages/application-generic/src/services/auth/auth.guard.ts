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
    Logger.log('JwtAuthGuard getAuthenticateOptions');
    const request = context.switchToHttp().getRequest();
    const authorizationHeader = request.headers.authorization;
    const authScheme = authorizationHeader.split(' ')[0];
    request.authScheme = authScheme;

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
        throw new UnauthorizedException('Invalid auth scheme');
    }
  }

  handleRequest<TUser = IJwtPayload>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any
  ): TUser {
    const request = context.switchToHttp().getRequest();
    Logger.log('JwtAuthGuard handleRequest');

    this.logger.assign({
      userId: user._id,
      environmentId: user.environmentId,
      organizationId: user.organizationId,
      authScheme: request.authScheme,
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
