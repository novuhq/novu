import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerException,
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { EvaluateApiRateLimit, EvaluateApiRateLimitCommand } from '../usecases/evaluate-api-rate-limit';
import { Reflector } from '@nestjs/core';
import { FeatureFlagCommand, GetIsApiRateLimitingEnabled } from '@novu/application-generic';
import * as jwt from 'jsonwebtoken';
import { ApiRateLimitCategoryEnum, ApiRateLimitCostEnum, ApiServiceLevelEnum, IJwtPayload } from '@novu/shared';
import { ThrottlerCost, ThrottlerCategory } from './throttler.decorator';

export enum RateLimitHeaderKeysEnum {
  RATE_LIMIT_REMAINING = 'RateLimit-Remaining',
  RATE_LIMIT_LIMIT = 'RateLimit-Limit',
  RATE_LIMIT_RESET = 'RateLimit-Reset',
  RATE_LIMIT_POLICY = 'RateLimit-Policy',
  RETRY_AFTER = 'Retry-After',
  USER_AGENT = 'User-Agent',
  AUTHORIZATION = 'Authorization',
}

export const THROTTLED_EXCEPTION_MESSAGE = 'API rate limit exceeded';
export const ALLOWED_AUTH_SCHEMES = ['ApiKey'];

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
    private getIsApiRateLimitingEnabled: GetIsApiRateLimitingEnabled
  ) {
    super(options, storageService, reflector);
  }

  /**
   * Thin wrapper around the ThrottlerGuard's canActivate method.
   */
  async intercept(context: ExecutionContext, next: CallHandler) {
    try {
      await this.canActivate(context);

      return next.handle();
    } catch (error) {
      throw error;
    }
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const isAllowedAuthScheme = this.isAllowedAuthScheme(context);
    if (!isAllowedAuthScheme) {
      return true;
    }

    const user = this.getReqUser(context);
    const { organizationId, environmentId, _id } = user;

    const isEnabled = await this.getIsApiRateLimitingEnabled.execute(
      FeatureFlagCommand.create({
        environmentId,
        organizationId,
        userId: _id,
      })
    );

    return !isEnabled;
  }

  /**
   * Throttles incoming HTTP requests.
   * All the outgoing requests will contain RFC-compatible RateLimit headers.
   * @see https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/
   * @throws {ThrottlerException}
   */
  protected async handleRequest(
    context: ExecutionContext,
    _limit: number,
    _ttl: number,
    throttler: ThrottlerOptions
  ): Promise<boolean> {
    const { req, res } = this.getRequestResponse(context);
    const ignoreUserAgents = throttler.ignoreUserAgents ?? this.commonOptions.ignoreUserAgents;
    // Return early if the current user agent should be ignored.
    if (Array.isArray(ignoreUserAgents)) {
      for (const pattern of ignoreUserAgents) {
        if (pattern.test(req.headers[RateLimitHeaderKeysEnum.USER_AGENT.toLowerCase()])) {
          return true;
        }
      }
    }

    const handler = context.getHandler();
    const classRef = context.getClass();
    const apiRateLimitCategory =
      this.reflector.getAllAndOverride(ThrottlerCategory, [handler, classRef]) || defaultApiRateLimitCategory;
    const apiRateLimitCost =
      this.reflector.getAllAndOverride(ThrottlerCost, [handler, classRef]) || defaultApiRateLimitCost;

    const { organizationId, environmentId } = this.getReqUser(context);

    const { success, limit, remaining, reset, windowDuration, burstLimit, algorithm, apiServiceLevel } =
      await this.evaluateApiRateLimit.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId,
          environmentId,
          apiRateLimitCategory,
          apiRateLimitCost,
        })
      );

    const secondsToReset = Math.max(Math.ceil((reset - Date.now()) / 1e3), 0);

    res.header(RateLimitHeaderKeysEnum.RATE_LIMIT_REMAINING, remaining);
    res.header(RateLimitHeaderKeysEnum.RATE_LIMIT_LIMIT, limit);
    res.header(RateLimitHeaderKeysEnum.RATE_LIMIT_RESET, secondsToReset);
    res.header(
      RateLimitHeaderKeysEnum.RATE_LIMIT_POLICY,
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

    if (success) {
      return true;
    } else {
      res.header(RateLimitHeaderKeysEnum.RETRY_AFTER, secondsToReset);
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
    const req = context.switchToHttp().getRequest();
    const authorization = req.headers[RateLimitHeaderKeysEnum.AUTHORIZATION.toLowerCase()];
    if (!authorization) {
      return false;
    }

    return ALLOWED_AUTH_SCHEMES.some((scheme) => req.authScheme === scheme);
  }

  private getReqUser(context: ExecutionContext): IJwtPayload {
    const req = context.switchToHttp().getRequest();
    const token = req.headers[RateLimitHeaderKeysEnum.AUTHORIZATION.toLowerCase()].split(' ')[1];

    return jwt.decode(token);
  }
}
