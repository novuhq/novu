import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const providedKey = authHeader.replace('Bearer ', '');
    if (!providedKey) {
      throw new UnauthorizedException('Missing API key');
    }

    const validApiKey = process.env.INTERNAL_SERVICES_API_KEY;
    if (!validApiKey) {
      throw new UnauthorizedException('Internal API key not configured');
    }

    if (!this.constantTimeEquals(providedKey, validApiKey)) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }

  private constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i += 1) {
      // eslint-disable-next-line no-bitwise
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}
