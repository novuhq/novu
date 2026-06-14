import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { getRequestHeaderValue } from '../../shared/helpers/get-request-header-value';
import { areStringsEqual } from '../../shared/helpers/timing-safe-equal';

@Injectable()
export class InternalCallbackGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const authHeader = getRequestHeaderValue(request.headers['authorization']);
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    const token = authHeader.replace('Bearer ', '');
    const expectedApiKey = process.env.INTERNAL_CALLBACK_API_KEY;

    if (!expectedApiKey) {
      throw new UnauthorizedException('INTERNAL_CALLBACK_API_KEY is not configured');
    }

    if (!areStringsEqual(expectedApiKey, token)) {
      throw new UnauthorizedException('Invalid internal callback API key');
    }

    return true;
  }
}
