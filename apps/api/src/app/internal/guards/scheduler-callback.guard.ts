import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class SchedulerCallbackGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers['authorization'];
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    const token = authHeader.replace('Bearer ', '');
    const expectedApiKey = process.env.SCHEDULER_CALLBACK_API_KEY;

    if (!expectedApiKey) {
      throw new UnauthorizedException('SCHEDULER_CALLBACK_API_KEY is not configured');
    }

    if (token !== expectedApiKey) {
      throw new UnauthorizedException('Invalid scheduler callback API key');
    }

    return true;
  }
}

