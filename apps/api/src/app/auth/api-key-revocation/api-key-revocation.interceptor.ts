import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ApiAuthSchemeEnum, UserSessionData } from '@novu/shared';
import { Observable } from 'rxjs';
import { ApiKeyRevocationService } from './api-key-revocation.service';

type ApiKeyRequest = {
  user?: UserSessionData;
  headers?: Record<string, unknown>;
  method: string;
  path: string;
  route?: { path?: unknown };
};

/**
 * Rejects calls made with a secret key that `API_KEY_REVOCATION_POLICY` revokes. Runs after authentication and
 * before the rate limit, idempotency and every handler, and checks the matched route pattern, so the allowed routes
 * cannot be reached through another path.
 */
@Injectable()
export class ApiKeyRevocationInterceptor implements NestInterceptor {
  constructor(private readonly apiKeyRevocationService: ApiKeyRevocationService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<ApiKeyRequest>();
    const { user } = request;

    if (user?.scheme !== ApiAuthSchemeEnum.API_KEY || !user.organizationId) {
      return next.handle();
    }

    await this.apiKeyRevocationService.assertRequestAllowed({
      organizationId: user.organizationId,
      environmentId: user.environmentId,
      authorization: request.headers?.authorization,
      method: request.method,
      routePath: typeof request.route?.path === 'string' ? request.route.path : request.path,
    });

    return next.handle();
  }
}
