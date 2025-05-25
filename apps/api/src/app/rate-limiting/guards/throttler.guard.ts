/** cspell:disable */
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerException,
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerRequest,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getClientIp } from 'request-ip';
import {
  Instrument,
  HttpRequestHeaderKeysEnum,
  HttpResponseHeaderKeysEnum,
  FeatureFlagsService,
  PinoLogger,
} from '@novu/application-generic';
import {
  ApiAuthSchemeEnum,
  ApiRateLimitCategoryEnum,
  ApiRateLimitCostEnum,
  FeatureFlagsKeysEnum,
  UserSessionData,
} from '@novu/shared';
import { UserEntity, OrganizationEntity, EnvironmentEntity } from '@novu/dal';
import { ThrottlerCategory, ThrottlerCost } from './throttler.decorator';
import { EvaluateApiRateLimit, EvaluateApiRateLimitCommand } from '../usecases/evaluate-api-rate-limit';
import { checkIsKeylessHeader } from '../../shared/utils/auth.utils';

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
    const isAllowedAuthScheme = this.isAllowedAuthScheme(context);
    const isAllowedEnvironment = this.isAllowedEnvironment(context);
    const isAllowedRoute = this.isAllowedRoute(context);

    this.logger.debug('shouldSkip evaluation', {
      isAllowedAuthScheme,
      isAllowedEnvironment,
      isAllowedRoute,
    });

    if (!isAllowedAuthScheme && !isAllowedEnvironment && !isAllowedRoute) {
      this.logger.debug('Skipping rate limiting - no allowed conditions met');

      return true;
    }

    const user = this.getReqUser(context);

    // Indicates whether the request originates from a Inbox session initialization
    if (!user) {
      this.logger.debug('No user found in request context');

      return false;
    }

    const { organizationId, environmentId, _id } = user;

    this.logger.debug('User context for shouldSkip', {
      userId: _id,
      organizationId,
      environmentId,
    });

    const isEnabled = await this.featureFlagService.getFlag({
      key: FeatureFlagsKeysEnum.IS_API_RATE_LIMITING_ENABLED,
      defaultValue: false,
      environment: { _id: environmentId } as EnvironmentEntity,
      organization: { _id: organizationId } as OrganizationEntity,
      user: { _id } as UserEntity,
    });

    this.logger.debug('Rate limiting feature flag evaluation', {
      isEnabled,
      featureFlagKey: FeatureFlagsKeysEnum.IS_API_RATE_LIMITING_ENABLED,
      userId: _id,
      organizationId,
      environmentId,
    });

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

    this.logger.debug('handleRequest started', {
      method: req.method,
      path: req.path,
      userAgent: req.headers[HttpRequestHeaderKeysEnum.USER_AGENT.toLowerCase()],
      authorization: req.headers.authorization ? 'present' : 'missing',
      novuApplicationIdentifier: req.headers['novu-application-identifier'] ? 'present' : 'missing',
      // Standard Express/Node.js IP fields
      ip: req.ip,
      ips: req.ips,
      remoteAddress: req.connection?.remoteAddress,
      socketRemoteAddress: req.socket?.remoteAddress,
      // Common proxy/load balancer headers
      xForwardedFor: req.headers['x-forwarded-for'],
      xRealIp: req.headers['x-real-ip'],
      xClientIp: req.headers['x-client-ip'],
      xForwardedProto: req.headers['x-forwarded-proto'],
      xOriginalForwardedFor: req.headers['x-original-forwarded-for'],
      // CDN headers
      cfConnectingIp: req.headers['cf-connecting-ip'], // Cloudflare
      cfIpCountry: req.headers['cf-ipcountry'], // Cloudflare country
      trueClientIp: req.headers['true-client-ip'], // Cloudflare Enterprise
      // AWS/Azure headers
      xForwardedHost: req.headers['x-forwarded-host'],
      xAzureClientIp: req.headers['x-azure-clientip'], // Azure
      xAzureSocketIp: req.headers['x-azure-socketip'], // Azure
      // Other common headers
      forwarded: req.headers.forwarded, // RFC 7239
      via: req.headers.via,
      xClusterClientIp: req.headers['x-cluster-client-ip'],
      xOriginalIp: req.headers['x-original-ip'],
      clientIp: req.headers['client-ip'],
    });

    const clientIpFromPackage = getClientIp(req) || undefined;

    this.logger.debug('handleRequest started', {
      method: req.method,
      path: req.path,
      userAgent: req.headers[HttpRequestHeaderKeysEnum.USER_AGENT.toLowerCase()],
      authorization: req.headers.authorization ? 'present' : 'missing',
      novuApplicationIdentifier: req.headers['novu-application-identifier'] ? 'present' : 'missing',
    });

    this.logger.debug('IP comparison - request-ip package vs manual extraction', {
      // request-ip package result
      clientIpFromPackage,
      // Manual extraction for comparison
      reqIp: req.ip,
      reqIps: req.ips,
      remoteAddress: req.connection?.remoteAddress,
      socketRemoteAddress: req.socket?.remoteAddress,
      // Key headers that request-ip checks (in priority order)
      xForwardedFor: req.headers['x-forwarded-for'],
      cfConnectingIp: req.headers['cf-connecting-ip'],
      trueClientIp: req.headers['true-client-ip'],
      xClusterClientIp: req.headers['x-cluster-client-ip'],
      forwarded: req.headers.forwarded,
    });

    const ignoreUserAgents = throttler.ignoreUserAgents ?? this.commonOptions.ignoreUserAgents;
    // Return early if the current user agent should be ignored.
    if (Array.isArray(ignoreUserAgents)) {
      for (const pattern of ignoreUserAgents) {
        if (pattern.test(req.headers[HttpRequestHeaderKeysEnum.USER_AGENT.toLowerCase()])) {
          this.logger.debug('Request ignored due to user agent pattern', {
            pattern: pattern.toString(),
            userAgent: req.headers[HttpRequestHeaderKeysEnum.USER_AGENT.toLowerCase()],
          });

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

    this.logger.debug('Request classification', {
      isKeylessHeader,
      isKeylessRoute: this.isKeylessRoute(context),
      isKeylessRequest,
      apiRateLimitCategory,
      authorizationHeader: req.headers.authorization ? `${req.headers.authorization.substring(0, 20)}...` : 'missing',
      novuApplicationIdentifier: req.headers['novu-application-identifier'],
    });

    const user = this.getReqUser(context);
    const organizationId = user?.organizationId;
    const _id = user?._id;
    const environmentId = user?.environmentId || req.headers['novu-application-identifier'];

    this.logger.debug('User and environment context', {
      hasUser: !!user,
      userId: _id,
      organizationId,
      environmentId,
      userEmail: user?.email,
      userEnvironmentId: user?.environmentId,
      headerEnvironmentId: req.headers['novu-application-identifier'],
    });

    const apiRateLimitCost = isKeylessRequest
      ? getKeylessCost()
      : this.reflector.getAllAndOverride(ThrottlerCost, [handler, classRef]) || defaultApiRateLimitCost;

    this.logger.debug('Rate limit cost calculation', {
      isKeylessRequest,
      apiRateLimitCost,
      nodeEnv: process.env.NODE_ENV,
      keylessCost: getKeylessCost(),
      defaultCost: defaultApiRateLimitCost,
    });

    const evaluateCommand = EvaluateApiRateLimitCommand.create({
      organizationId,
      environmentId,
      apiRateLimitCategory,
      apiRateLimitCost,
      ip: isKeylessRequest ? clientIpFromPackage : undefined,
    });

    this.logger.debug('EvaluateApiRateLimitCommand', {
      organizationId,
      environmentId,
      apiRateLimitCategory,
      apiRateLimitCost,
      ip: isKeylessRequest ? clientIpFromPackage : undefined,
      ipFromReqIp: isKeylessRequest ? req.ip : undefined,
      isKeylessRequest,
    });

    const { success, limit, remaining, reset, windowDuration, burstLimit, algorithm, apiServiceLevel } =
      await this.evaluateApiRateLimit.execute(evaluateCommand);

    const secondsToReset = Math.max(Math.ceil((reset - Date.now()) / 1e3), 0);

    this.logger.debug('Rate limit evaluation result', {
      success,
      limit,
      remaining,
      reset,
      secondsToReset,
      windowDuration,
      burstLimit,
      algorithm,
      apiServiceLevel,
      currentTime: Date.now(),
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

    this.logger.debug('Dry run feature flag evaluation', {
      isDryRun,
      featureFlagKey: FeatureFlagsKeysEnum.IS_API_RATE_LIMITING_DRY_RUN_ENABLED,
      userId: _id,
      organizationId,
      environmentId,
    });

    const isKeylessDryRunFlag = await this.featureFlagService.getFlag({
      environment: { _id: environmentId } as EnvironmentEntity,
      organization: { _id: organizationId } as OrganizationEntity,
      user: { _id, email: user?.email } as UserEntity,
      key: FeatureFlagsKeysEnum.IS_API_RATE_LIMITING_KEYLESS_DRY_RUN_ENABLED,
      defaultValue: false,
    });
    const isKeylessDryRun = isKeylessRequest && isKeylessDryRunFlag;

    this.logger.debug('Keyless dry run feature flag evaluation', {
      isKeylessDryRunFlag,
      isKeylessDryRun,
      isKeylessRequest,
      featureFlagKey: FeatureFlagsKeysEnum.IS_API_RATE_LIMITING_KEYLESS_DRY_RUN_ENABLED,
      userId: _id,
      userEmail: user?.email,
      organizationId,
      environmentId,
    });

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
      this.logger.debug('Dry run mode active', {
        isDryRun,
        isKeylessDryRun,
        success,
        wouldBeThrottled: !success,
      });

      if (!success) {
        this.logger.warn(`${isKeylessRequest ? '[Dry run] [Keyless]' : '[Dry run]'} ${THROTTLED_EXCEPTION_MESSAGE}`);
      }

      return true;
    }

    this.logger.debug('Rate limiting enforcement decision', {
      success,
      isDryRun,
      isKeylessDryRun,
      willThrottle: !success,
    });

    if (success) {
      return true;
    } else {
      res.header(HttpResponseHeaderKeysEnum.RETRY_AFTER, secondsToReset);
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
