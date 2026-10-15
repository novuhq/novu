import { CallHandler, ExecutionContext, HttpException, HttpStatus, Injectable, NestInterceptor } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { EnvironmentEntity, EnvironmentRepository } from '@novu/dal';
import { ApiAuthSchemeEnum, UserSessionData } from '@novu/shared';
import { Observable } from 'rxjs';

import { ConnectClaimTokenService } from '../connect/services/connect-claim-token.service';
import { resolveKeylessAgentClaimUrl } from './keyless-agent-claim-url';
import {
  getKeylessAgentEnvironmentExpiresAt,
  hashApiKey,
  isKeylessAgentEnvironment,
  isKeylessAgentEnvironmentExpired,
  KeylessAgentErrorCodeEnum,
} from './keyless-agent-environment';
import { isKeylessOrganization } from './keyless-organization.helpers';
import { computeKeylessTriggerCost, isKeylessApiKeyRouteAllowed } from './keyless-scope.allowlist';
import { resolveConnectClaimBaseUrl } from './keyless-signup.helpers';
import { KeylessTriggerCapService } from './keyless-trigger-cap.service';

export const KEYLESS_ENVIRONMENT_CLAIMED_MESSAGE =
  'This environment was claimed. Use the Development secret key from your Novu dashboard (API Keys).';

const API_KEY_HEADER_PREFIX = `${ApiAuthSchemeEnum.API_KEY} `;

type ScopedEnvironment = Pick<EnvironmentEntity, '_id' | '_organizationId' | 'identifier' | 'name' | 'createdAt'> & {
  apiKeys?: Array<{ hash?: string }>;
};

interface KeylessScopedRequest {
  method: string;
  path: string;
  route?: { path?: string };
  authScheme?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  user?: UserSessionData;
}

/**
 * Every keyless environment shares one organization, so `ApiKey` requests from
 * it are confined to an allowlist and re-checked against the database (the API
 * key strategy caches users in memory, which would otherwise outlive a claim).
 */
@Injectable()
export class KeylessScopeInterceptor implements NestInterceptor {
  constructor(
    private readonly environmentRepository: EnvironmentRepository,
    private readonly connectClaimTokenService: ConnectClaimTokenService,
    private readonly keylessTriggerCapService: KeylessTriggerCapService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<KeylessScopedRequest>();
    const { user } = request;

    if (!user || !isApiKeyRequest(request, user) || !isKeylessOrganization(user.organizationId)) {
      return next.handle();
    }

    await this.assertKeylessApiKeyRequestAllowed(request, user);

    return next.handle();
  }

  private async assertKeylessApiKeyRequestAllowed(request: KeylessScopedRequest, user: UserSessionData): Promise<void> {
    const environment = (await this.environmentRepository.findOne(
      { _id: user.environmentId, _organizationId: user.organizationId },
      '_id _organizationId identifier name createdAt apiKeys.hash'
    )) as ScopedEnvironment | null;

    const presentedKeyHash = hashApiKey(extractApiKey(request.headers.authorization));

    if (!environment?.apiKeys?.some((apiKey) => apiKey.hash === presentedKeyHash)) {
      throw keylessHttpException(HttpStatus.UNAUTHORIZED, {
        code: KeylessAgentErrorCodeEnum.ENVIRONMENT_CLAIMED,
        message: KEYLESS_ENVIRONMENT_CLAIMED_MESSAGE,
      });
    }

    const isAgentEnvironment = isKeylessAgentEnvironment(environment);

    if (isAgentEnvironment) {
      assertAgentEnvironmentNotExpired(environment);
    }

    const matchedPaths = [request.path, request.route?.path].filter((path): path is string => Boolean(path));

    if (!matchedPaths.every((path) => isKeylessApiKeyRouteAllowed(request.method, path))) {
      const claimUrl = isAgentEnvironment ? await this.resolveClaimUrl(environment) : undefined;

      throw keylessHttpException(HttpStatus.FORBIDDEN, {
        code: KeylessAgentErrorCodeEnum.REQUIRES_ACCOUNT,
        message: claimUrl
          ? `This API is not available to keyless environments. Claim this environment to unlock it: ${claimUrl}`
          : 'This API is not available to keyless environments. Sign up for a free Novu account to use it.',
        claimUrl,
      });
    }

    const triggerCost = isAgentEnvironment
      ? computeKeylessTriggerCost(request.method, request.path, request.body)
      : null;

    if (triggerCost === null) {
      return;
    }

    const { allowed, cap } = await this.keylessTriggerCapService.consume(environment._id, triggerCost);

    if (!allowed) {
      const claimUrl = await this.resolveClaimUrl(environment);

      throw keylessHttpException(HttpStatus.TOO_MANY_REQUESTS, {
        code: KeylessAgentErrorCodeEnum.TRIGGER_LIMIT_REACHED,
        message: claimUrl
          ? `This keyless environment reached its daily limit of ${cap} notification recipients. Claim it to keep sending: ${claimUrl}`
          : `This keyless environment reached its daily limit of ${cap} notification recipients. Try again tomorrow.`,
        claimUrl,
      });
    }
  }

  private async resolveClaimUrl(environment: ScopedEnvironment): Promise<string | undefined> {
    if (!environment.createdAt) {
      return undefined;
    }

    try {
      const { claimUrl } = await resolveKeylessAgentClaimUrl(this.connectClaimTokenService, {
        environmentId: environment._id,
        organizationId: environment._organizationId,
        createdAt: environment.createdAt,
      });

      return claimUrl;
    } catch (error) {
      this.logger.warn({ err: error, environmentId: environment._id }, 'Could not mint a keyless claim URL');

      return undefined;
    }
  }
}

function isApiKeyRequest(request: KeylessScopedRequest, user: UserSessionData): boolean {
  return user.scheme === ApiAuthSchemeEnum.API_KEY || request.authScheme === ApiAuthSchemeEnum.API_KEY;
}

function extractApiKey(authorization: string | string[] | undefined): string {
  if (typeof authorization !== 'string' || !authorization.startsWith(API_KEY_HEADER_PREFIX)) {
    return '';
  }

  return authorization.slice(API_KEY_HEADER_PREFIX.length);
}

function assertAgentEnvironmentNotExpired(environment: ScopedEnvironment): void {
  if (environment.createdAt && !isKeylessAgentEnvironmentExpired(environment.createdAt)) {
    return;
  }

  const expiresAt = environment.createdAt
    ? getKeylessAgentEnvironmentExpiresAt(environment.createdAt).toISOString()
    : undefined;
  const expiredOn = expiresAt ? ` on ${expiresAt}` : '';

  throw keylessHttpException(HttpStatus.UNAUTHORIZED, {
    code: KeylessAgentErrorCodeEnum.ENVIRONMENT_EXPIRED,
    message: `This keyless environment expired${expiredOn}. Create a new one or sign up at ${resolveConnectClaimBaseUrl()}.`,
    expiresAt,
  });
}

function keylessHttpException(
  status: HttpStatus,
  body: { code: KeylessAgentErrorCodeEnum; message: string; claimUrl?: string; expiresAt?: string }
): HttpException {
  const extras = Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined));

  return new HttpException({ statusCode: status, ...extras }, status);
}
