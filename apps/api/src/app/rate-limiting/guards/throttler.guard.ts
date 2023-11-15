// throttler-behind-proxy.guard.ts
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerException,
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { EvaluateApiRateLimit, EvaluateApiRateLimitCommand } from '../usecases/evaluate-api-rate-limit';
import { Reflector } from '@nestjs/core';
import { FeatureFlagCommand, GetIsRequestRateLimitingEnabled } from '@novu/application-generic';
import { ApiRateLimitCategoryTypeEnum, IJwtPayload } from '@novu/shared';
import * as jwt from 'jsonwebtoken';
import { ThrottlerBulk, ThrottlerCategory } from './throttler.decorator';

enum HeaderKeysEnum {
  RATE_LIMIT_REMAINING = 'RateLimit-Remaining',
  RATE_LIMIT_LIMIT = 'RateLimit-Limit',
  RATE_LIMIT_RESET = 'RateLimit-Reset',
  RATE_LIMIT_POLICY = 'RateLimit-Policy',
  RETRY_AFTER = 'Retry-After',
  USER_AGENT = 'User-Agent',
}

export const THROTTLED_EXCEPTION_MESSAGE = 'API rate limit exceeded';

@Injectable()
export class ApiRateLimitGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() protected readonly options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() protected readonly storageService: ThrottlerStorage,
    reflector: Reflector,
    private evaluateApiRateLimit: EvaluateApiRateLimit,
    private getIsRequestRateLimitingEnabled: GetIsRequestRateLimitingEnabled
  ) {
    super(options, storageService, reflector);
  }

  protected async shouldSkip(_context: ExecutionContext): Promise<boolean> {
    const user = this.getReqUser(_context);
    if (user === null) {
      return true;
    }
    const { organizationId, environmentId, _id } = user;

    const isEnabled = await this.getIsRequestRateLimitingEnabled.execute(
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
        if (pattern.test(req.headers[HeaderKeysEnum.USER_AGENT.toLowerCase()])) {
          return true;
        }
      }
    }

    const handler = context.getHandler();
    const classRef = context.getClass();
    const apiRateLimitCategory =
      this.reflector.getAllAndOverride(ThrottlerCategory, [handler, classRef]) || ApiRateLimitCategoryTypeEnum.GLOBAL;
    const isBulk = this.reflector.getAllAndOverride(ThrottlerBulk, [handler, classRef]) || false;

    const user = this.getReqUser(context);
    if (user === null) {
      return true;
    }
    const { organizationId, environmentId } = user;

    const { success, limit, remaining, reset, windowDuration, burstLimit, algorithm } =
      await this.evaluateApiRateLimit.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId,
          environmentId,
          apiRateLimitCategory,
          isBulk,
        })
      );

    const secondsToReset = Math.max(Math.ceil((reset - Date.now()) / 1000), 0);

    res.header(HeaderKeysEnum.RATE_LIMIT_REMAINING, remaining);
    res.header(HeaderKeysEnum.RATE_LIMIT_LIMIT, limit);
    res.header(HeaderKeysEnum.RATE_LIMIT_RESET, secondsToReset);
    res.header(
      HeaderKeysEnum.RATE_LIMIT_POLICY,
      `${limit};w=${windowDuration};burst=${burstLimit};comment="${algorithm}";category="${apiRateLimitCategory}"`
    );

    if (success) {
      return true;
    } else {
      res.header(HeaderKeysEnum.RETRY_AFTER, secondsToReset);
      throw new ThrottlerException(THROTTLED_EXCEPTION_MESSAGE);
    }
  }

  private getReqUser(context: ExecutionContext): IJwtPayload | null {
    const req = context.switchToHttp().getRequest();
    Logger.log('User:' + req.user);
    Logger.log('Authorization:' + req.headers?.authorization);

    if (req?.user?.organizationId) {
      // APIKey
      return req.user;
    }
    if (req.headers?.authorization?.length) {
      // Bearer token
      const token = req.headers.authorization.split(' ')[1];
      if (token) {
        return jwt.decode(token);
      }
    }

    return null;
  }
}
