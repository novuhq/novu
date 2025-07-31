import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerException,
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerRequest,
  ThrottlerStorage,
} from '@nestjs/throttler';
import {
  FeatureFlagsService,
  HttpRequestHeaderKeysEnum,
  HttpResponseHeaderKeysEnum,
  Instrument,
  PinoLogger,
} from '@novu/application-generic';
import { EnvironmentEntity, OrganizationEntity, UserEntity } from '@novu/dal';
import {
  ApiAuthSchemeEnum,
  ApiRateLimitCategoryEnum,
  ApiRateLimitCostEnum,
  FeatureFlagsKeysEnum,
  UserSessionData,
} from '@novu/shared';
import { getClientIp } from 'request-ip';
import { checkIsKeylessHeader } from '../../shared/utils/auth.utils';
import { EvaluateApiRateLimit, EvaluateApiRateLimitCommand } from '../usecases/evaluate-api-rate-limit';
import { ThrottlerCategory, ThrottlerCost } from './throttler.decorator';

export const THROTTLED_EXCEPTION_MESSAGE = 'API rate limit exceeded';
export const ALLOWED_AUTH_SCHEMES = [ApiAuthSchemeEnum.API_KEY, ApiAuthSchemeEnum.KEYLESS];

const defaultApiRateLimitCategory = ApiRateLimitCategoryEnum.GLOBAL;
const defaultApiRateLimitCost = ApiRateLimitCostEnum.SINGLE;

/**
 * An interceptor is used instead of a guard to ensure that Auth context is available.
 * This is currently necessary because we do not currently have a global guard configured for Auth,
 * therefore the Auth context is not guaranteed to be available in the guard.
 */
@Injectable()
export class ApiRateLimitInterceptor extends ThrottlerGuard implements NestInterceptor {
  constructor(
    @InjectThrottlerOptions() protected readonly options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() protected readonly storageService: ThrottlerStorage,
    reflector: Reflector,
    private evaluateApiRateLimit: EvaluateApiRateLimit,
    private featureFlagService: FeatureFlagsService,
    private logger: PinoLogger
  ) {
    super(options, storageService, reflector);
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Thin wrapper around the ThrottlerGuard's canActivate method.
   */
  async intercept(context: ExecutionContext, next: CallHandler) {
    await this.canActivate(context);

    return next.handle();
  }

  @Instrument()
  canActivate(context: ExecutionContext): Promise<boolean> {
    return super.canActivate(context);
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const isAllowedAuthScheme = this.isAllowedAuthScheme(context);
    const isAllowedEnvironment = this.isAllowedEnvironment(context);
    const isAllowedRoute = this.isAllowedRoute(context);

    if (!isAllowedAuthScheme && !isAllowedEnvironment && !isAllowedRoute) {
      this.logger.debug({
        message: 'Rate limiting skipped - request criteria not met',
        _event: {
          path: req.path,
          authScheme: req.authScheme,
        },
      });

      return true;
    }

    const user = this.getReqUser(context);

    // Indicates whether the request originates from a Inbox session initialization
    if (!user) {
      return false;
    }

    const { organizationId, environmentId, _id } = user;

    const isEnabled = await this.featureFlagService.getFlag({
      key: FeatureFlagsKeysEnum.IS_API_RATE_LIMITING_ENABLED,
      defaultValue: false,
      environment: { _id: environmentId } as EnvironmentEntity,
      organization: { _id: organizationId } as OrganizationEntity,
      user: { _id } as UserEntity,
    });

    if (!isEnabled) {
      this.logger.debug({
        message: 'Rate limiting skipped - feature flag disabled',
        _event: {
          organizationId,
          environmentId,
        },
      });
    }

    return !isEnabled;
  }

  /**
   * Throttles incoming HTTP requests.
   * All the outgoing requests will contain RFC-compatible RateLimit headers.
   * @see https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/
   * @throws {ThrottlerException}
   */
  protected async handleRequest({ context, throttler }: ThrottlerRequest): Promise<boolean> {
    const { req, res } = this.getRequestResponse(context);
    const clientIp = getClientIp(req) || undefined;

    const ignoreUserAgents = throttler.ignoreUserAgents ?? this.commonOptions.ignoreUserAgents;
    // Return early if the current user agent should be ignored.
    if (Array.isArray(ignoreUserAgents)) {
      for (const pattern of ignoreUserAgents) {
        if (pattern.test(req.headers[HttpRequestHeaderKeysEnum.USER_AGENT.toLowerCase()])) {
          return true;
        }
      }
    }

    const handler = context.getHandler();
    const classRef = context.getClass();

    const isKeylessHeader =
      checkIsKeylessHeader(req.headers.authorization) ||
      checkIsKeylessHeader(req.headers['novu-application-identifier']);
    const isKeylessRequest = isKeylessHeader || this.isKeylessRoute(context);
    const apiRateLimitCategory =
      this.reflector.getAllAndOverride(ThrottlerCategory, [handler, classRef]) || defaultApiRateLimitCategory;

    const user = this.getReqUser(context);
    const organizationId = user?.organizationId;
    const _id = user?._id;
    const environmentId = user?.environmentId || req.headers['novu-application-identifier'];

    const apiRateLimitCost = isKeylessRequest
      ? getKeylessCost()
      : this.reflector.getAllAndOverride(ThrottlerCost, [handler, classRef]) || defaultApiRateLimitCost;

    const evaluateCommand = EvaluateApiRateLimitCommand.create({
      organizationId,
      environmentId,
      apiRateLimitCategory,
      apiRateLimitCost,
      ip: isKeylessRequest ? clientIp : undefined,
    });

    const { success, limit, remaining, reset, windowDuration, burstLimit, algorithm, apiServiceLevel } =
      await this.evaluateApiRateLimit.execute(evaluateCommand);

    const secondsToReset = Math.max(Math.ceil((reset - Date.now()) / 1e3), 0);

    this.logger.debug({
      message: 'Rate limit evaluated',
      _event: {
        success,
        limit,
        remaining,
        category: apiRateLimitCategory,
        cost: apiRateLimitCost,
        isKeyless: isKeylessRequest,
        organizationId,
        environmentId,
        ip: clientIp,
      },
    });

    /**
     * The purpose of the dry run is to allow us to observe how
     * the rate limiting would behave without actually enforcing it.
     */
    const isDryRun = await this.featureFlagService.getFlag({
      environment: { _id: environmentId } as EnvironmentEntity,
      organization: { _id: organizationId } as OrganizationEntity,
      user: { _id } as UserEntity,
      key: FeatureFlagsKeysEnum.IS_API_RATE_LIMITING_DRY_RUN_ENABLED,
      defaultValue: false,
    });

    const isKeylessDryRunFlag = await this.featureFlagService.getFlag({
      environment: { _id: environmentId } as EnvironmentEntity,
      organization: { _id: organizationId } as OrganizationEntity,
      user: { _id, email: user?.email } as UserEntity,
      key: FeatureFlagsKeysEnum.IS_API_RATE_LIMITING_KEYLESS_DRY_RUN_ENABLED,
      defaultValue: false,
    });
    const isKeylessDryRun = isKeylessRequest && isKeylessDryRunFlag;

    res.header(HttpResponseHeaderKeysEnum.RATELIMIT_REMAINING, remaining);
    res.header(HttpResponseHeaderKeysEnum.RATELIMIT_LIMIT, limit);
    res.header(HttpResponseHeaderKeysEnum.RATELIMIT_RESET, secondsToReset);
    res.header(
      HttpResponseHeaderKeysEnum.RATELIMIT_POLICY,
      this.createPolicyHeader(
        limit,
        windowDuration,
        burstLimit,
        algorithm,
        apiRateLimitCategory,
        apiRateLimitCost,
        apiServiceLevel
      )
    );

    res.rateLimitPolicy = {
      limit,
      windowDuration,
      burstLimit,
      algorithm,
      apiRateLimitCategory,
      apiRateLimitCost,
      apiServiceLevel,
    };

    if (isDryRun || isKeylessDryRun) {
      if (!success) {
        this.logger.warn({
          message: `${isKeylessRequest ? '[Dry run] [Keyless]' : '[Dry run]'} Rate limit would be exceeded`,
          _event: {
            limit,
            remaining,
            organizationId,
            environmentId,
            ip: clientIp,
          },
        });
      }

      return true;
    }

    if (success) {
      return true;
    } else {
      res.header(HttpResponseHeaderKeysEnum.RETRY_AFTER, secondsToReset);

      this.logger.debug({
        message: 'Rate limit exceeded',
        _event: {
          limit,
          remaining,
          retryAfter: secondsToReset,
          category: apiRateLimitCategory,
          organizationId,
          environmentId,
          ip: clientIp,
          isKeyless: isKeylessRequest,
        },
      });

      throw new ThrottlerException(THROTTLED_EXCEPTION_MESSAGE);
    }
  }

  private createPolicyHeader(
    limit: number,
    windowDuration: number,
    burstLimit: number,
    algorithm: string,
    apiRateLimitCategory: ApiRateLimitCategoryEnum,
    apiRateLimitCost: ApiRateLimitCostEnum,
    apiServiceLevel: string
  ): string {
    const policyMap = {
      w: windowDuration,
      burst: burstLimit,
      comment: `"${algorithm}"`,
      category: `"${apiRateLimitCategory}"`,
      cost: `"${apiRateLimitCost}"`,
      serviceLevel: `"${apiServiceLevel}"`,
    };
    const policy = Object.entries(policyMap).reduce((acc, [key, value]) => {
      return `${acc};${key}=${value}`;
    }, `${limit}`);

    return policy;
  }

  private isAllowedAuthScheme(context: ExecutionContext): boolean {
    const { authScheme } = context.switchToHttp().getRequest();

    return ALLOWED_AUTH_SCHEMES.some((scheme) => authScheme === scheme);
  }

  private isAllowedEnvironment(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const applicationIdentifier = req.headers['novu-application-identifier'];

    if (!applicationIdentifier) {
      return false;
    }

    return applicationIdentifier.startsWith('pk_keyless_');
  }

  private isAllowedRoute(context: ExecutionContext): boolean {
    return this.isKeylessRoute(context);
  }

  private isKeylessRoute(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    return req.path === '/v1/inbox/session' && req.method === 'POST';
  }

  private getReqUser(context: ExecutionContext): UserSessionData | undefined {
    const req = context.switchToHttp().getRequest();

    return req.user;
  }
}

function getKeylessCost() {
  // For test environment, we use a higher cost to ensure tests can run without rate limiting issues
  return process.env.NODE_ENV === 'test' ? defaultApiRateLimitCost : ApiRateLimitCostEnum.KEYLESS;
}
