import { CallHandler, ExecutionContext, HttpStatus, Injectable, NestInterceptor } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { EnvironmentEntity, EnvironmentRepository, SubscriberRepository, TopicSubscribersRepository } from '@novu/dal';
import { ApiAuthSchemeEnum, UserSessionData } from '@novu/shared';
import { Observable } from 'rxjs';

import { ConnectClaimTokenService } from '../connect/services/connect-claim-token.service';
import { KEYLESS_ENVIRONMENT_PREFIX } from '../inbox/utils/keyless.constants';
import { resolveKeylessAgentClaimUrl } from './keyless-agent-claim-url';
import {
  hashApiKey,
  isKeylessAgentEnvironment,
  isKeylessAgentEnvironmentExpired,
  KeylessAgentErrorCodeEnum,
} from './keyless-agent-environment';
import {
  createKeylessEnvironmentClaimedException,
  createKeylessEnvironmentExpiredException,
  keylessHttpException,
} from './keyless-agent-errors';
import { isKeylessOrganization } from './keyless-organization.helpers';
import {
  computeKeylessTriggerCost,
  isKeylessApiKeyRequestBodyAllowed,
  isKeylessApiKeyRouteAllowed,
  KeylessTriggerCost,
} from './keyless-scope.allowlist';
import { KeylessTriggerCapService } from './keyless-trigger-cap.service';

const API_KEY_HEADER_PREFIX = `${ApiAuthSchemeEnum.API_KEY} `;

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
    private readonly subscriberRepository: SubscriberRepository,
    private readonly topicSubscribersRepository: TopicSubscribersRepository,
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

    if (!user || !isKeylessOrganization(user.organizationId)) {
      return next.handle();
    }

    if (isAuthenticatedWith(ApiAuthSchemeEnum.KEYLESS, request, user)) {
      await this.assertKeylessSchemeEnvironment(user);
    } else if (isAuthenticatedWith(ApiAuthSchemeEnum.API_KEY, request, user)) {
      await this.assertKeylessApiKeyRequestAllowed(request, user);
    }

    return next.handle();
  }

  /**
   * The `Keyless` scheme authenticates with a public application identifier, which is
   * only acceptable for `pk_keyless_` demo environments. Any other environment of the
   * keyless organization (agent environments, the owner's own) must present its secret key.
   */
  private async assertKeylessSchemeEnvironment(user: UserSessionData): Promise<void> {
    const environment = await this.environmentRepository.findOne(
      { _id: user.environmentId, _organizationId: user.organizationId },
      'identifier'
    );

    if (!environment?.identifier.startsWith(KEYLESS_ENVIRONMENT_PREFIX)) {
      throw keylessHttpException(HttpStatus.UNAUTHORIZED, {
        code: KeylessAgentErrorCodeEnum.REQUIRES_ACCOUNT,
        message: 'This environment requires its secret key. Authenticate with `Authorization: ApiKey <secretKey>`.',
      });
    }
  }

  private async assertKeylessApiKeyRequestAllowed(request: KeylessScopedRequest, user: UserSessionData): Promise<void> {
    const environment = await this.findEnvironmentHoldingKey(request, user);
    const isAgentEnvironment = isKeylessAgentEnvironment(environment);

    if (isAgentEnvironment && (!environment.createdAt || isKeylessAgentEnvironmentExpired(environment.createdAt))) {
      throw createKeylessEnvironmentExpiredException(environment.createdAt);
    }

    await this.assertRouteAllowed(request, environment, isAgentEnvironment);

    if (isAgentEnvironment) {
      await this.consumeTriggerCap(request, environment);
    }
  }

  /** The database is the source of truth: a key removed by a claim must stop working immediately. */
  private async findEnvironmentHoldingKey(
    request: KeylessScopedRequest,
    user: UserSessionData
  ): Promise<EnvironmentEntity> {
    const environment = await this.environmentRepository.findOne(
      { _id: user.environmentId, _organizationId: user.organizationId },
      '_id _organizationId identifier name createdAt apiKeys.hash'
    );
    const presentedKeyHash = hashApiKey(extractApiKey(request.headers.authorization));

    if (!environment?.apiKeys?.some((apiKey) => apiKey.hash === presentedKeyHash)) {
      throw createKeylessEnvironmentClaimedException();
    }

    return environment;
  }

  private async assertRouteAllowed(
    request: KeylessScopedRequest,
    environment: EnvironmentEntity,
    isAgentEnvironment: boolean
  ): Promise<void> {
    const matchedPaths = [request.path, request.route?.path].filter((path): path is string => Boolean(path));

    const isAllowed =
      matchedPaths.every((path) => isKeylessApiKeyRouteAllowed(request.method, path)) &&
      isKeylessApiKeyRequestBodyAllowed(request.method, request.path, request.body);

    if (isAllowed) {
      return;
    }

    const claimUrl = isAgentEnvironment ? await this.resolveClaimUrl(environment) : undefined;

    throw keylessHttpException(HttpStatus.FORBIDDEN, {
      code: KeylessAgentErrorCodeEnum.REQUIRES_ACCOUNT,
      message: claimUrl
        ? `This API is not available to keyless environments. Claim this environment to unlock it: ${claimUrl}`
        : 'This API is not available to keyless environments. Sign up for a free Novu account to use it.',
      claimUrl,
    });
  }

  private async consumeTriggerCap(request: KeylessScopedRequest, environment: EnvironmentEntity): Promise<void> {
    const triggerCost = computeKeylessTriggerCost(request.method, request.path, request.body);

    if (triggerCost === null) {
      return;
    }

    const units = await this.resolveTriggerUnits(triggerCost, environment);
    const { allowed, cap } = await this.keylessTriggerCapService.consume(environment._id, units);

    if (allowed) {
      return;
    }

    const claimUrl = await this.resolveClaimUrl(environment);

    throw keylessHttpException(HttpStatus.TOO_MANY_REQUESTS, {
      code: KeylessAgentErrorCodeEnum.TRIGGER_LIMIT_REACHED,
      message: claimUrl
        ? `This keyless environment reached its daily limit of ${cap} notification recipients. Claim it to keep sending: ${claimUrl}`
        : `This keyless environment reached its daily limit of ${cap} notification recipients. Try again tomorrow.`,
      claimUrl,
    });
  }

  private async resolveTriggerUnits(cost: KeylessTriggerCost, environment: EnvironmentEntity): Promise<number> {
    switch (cost.type) {
      case 'recipients':
        if (cost.topicKeys.length === 0) {
          return cost.units;
        }

        return (
          cost.units +
          (await this.topicSubscribersRepository.count({
            _environmentId: environment._id,
            _organizationId: environment._organizationId,
            topicKey: { $in: [...new Set(cost.topicKeys)] },
          }))
        );
      case 'broadcast':
        return this.subscriberRepository.count({
          _environmentId: environment._id,
          _organizationId: environment._organizationId,
        });
      default: {
        const exhaustiveCheck: never = cost;

        return exhaustiveCheck;
      }
    }
  }

  private async resolveClaimUrl(environment: EnvironmentEntity): Promise<string | undefined> {
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

function isAuthenticatedWith(scheme: ApiAuthSchemeEnum, request: KeylessScopedRequest, user: UserSessionData): boolean {
  return user.scheme === scheme || request.authScheme === scheme;
}

function extractApiKey(authorization: string | string[] | undefined): string {
  if (typeof authorization !== 'string' || !authorization.startsWith(API_KEY_HEADER_PREFIX)) {
    return '';
  }

  return authorization.slice(API_KEY_HEADER_PREFIX.length);
}
