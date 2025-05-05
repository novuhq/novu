import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { HttpRequestHeaderKeysEnum } from '@novu/application-generic';

@Injectable()
export class SelfHostSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secretKey = process.env.SELF_HOSTED_SECRET_KEY;
    if (!secretKey) return true;

    const request = context.switchToHttp().getRequest();
    const headerKey = request.headers[HttpRequestHeaderKeysEnum.NOVU_SELF_HOSTED_SECRET_KEY.toLowerCase()];

    if (!headerKey) {
      throw new UnauthorizedException('Missing self-host secret key');
    }

    if (headerKey !== secretKey) {
      throw new UnauthorizedException('Invalid self-host secret key');
    }

    return true;
  }
}
