import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { HttpRequestHeaderKeysEnum } from '@novu/application-generic';

@Injectable()
export class SelfHostSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secretKey = process.env.SELF_HOSTED_TOKEN;
    if (!secretKey) return true;

    const request = context.switchToHttp().getRequest();
    const headerKey = request.headers[HttpRequestHeaderKeysEnum.NOVU_SELF_HOSTED_TOKEN.toLowerCase()];

    if (!headerKey) {
      throw new UnauthorizedException('Missing self-hosted token');
    }

    if (headerKey !== secretKey) {
      throw new UnauthorizedException(
        'Invalid self-hosted token, please validate that the API and Dashboard have the same token'
      );
    }

    return true;
  }
}
