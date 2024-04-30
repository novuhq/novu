import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GetFeatureFlag, GetFeatureFlagCommand } from '@novu/application-generic';
import { IJwtPayload, FeatureFlagsKeysEnum, ResourceEnum } from '@novu/shared';
import { Observable } from 'rxjs';
import { ResourceCategory } from './resource-throttler.decorator';

export const THROTTLED_EXCEPTION_MESSAGE = `You have exceeded the number of allowed requests for this resource. Please visit ${process.env.FRONT_BASE_URL}/settings/billing to upgrade your plan.`;

/**
 * An interceptor is used instead of a guard to ensure that Auth context is available.
 * This is currently necessary because we do not currently have a global guard configured for Auth,
 * therefore the Auth context is not guaranteed to be available in the guard.
 */
@Injectable()
export class ResourceThrottlerInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector, private getFeatureFlag: GetFeatureFlag) {}

  /**
   * Throttles incoming HTTP requests to resources.
   * @throws {HttpException}
   */
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    if (process.env.IS_DOCKER_HOSTED === 'true') {
      return next.handle();
    }

    const handler = context.getHandler();
    const classRef = context.getClass();
    const resourceCategory = this.reflector.getAllAndOverride(ResourceCategory, [handler, classRef]);

    switch (resourceCategory) {
      case ResourceEnum.EVENTS: {
        const user = this.getReqUser(context);
        const { organizationId, environmentId, _id } = user;

        const isEnabled = await this.getFeatureFlag.execute(
          GetFeatureFlagCommand.create({
            organizationId,
            environmentId: 'system',
            userId: 'system',
            key: FeatureFlagsKeysEnum.IS_EVENT_RESOURCE_LIMITING_ENABLED,
          })
        );

        // @TODO: Implement the logic to check the rate limit for the resource

        if (!isEnabled) {
          return next.handle();
        } else {
          throw new HttpException(THROTTLED_EXCEPTION_MESSAGE, HttpStatus.PAYMENT_REQUIRED);
        }
      }
      default:
        return next.handle();
    }
  }

  private getReqUser(context: ExecutionContext): IJwtPayload {
    const req = context.switchToHttp().getRequest();

    return req.user;
  }
}
