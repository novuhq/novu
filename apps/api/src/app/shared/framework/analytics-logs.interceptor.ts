import {
  SetMetadata,
  applyDecorators,
  ExecutionContext,
  Injectable,
  CallHandler,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FeatureFlagsService, PinoLogger, RequestLog, RequestLogRepository } from '@novu/application-generic';
import { UserSessionData, FeatureFlagsKeysEnum } from '@novu/shared';
import { getClientIp } from 'request-ip';
import { sanitizePayload, retryWithBackoff } from '../../../utils/payload-sanitizer';
import { TriggerEventResponseDto } from '../../events/dtos/trigger-event-response.dto';
import { generateTransactionId } from '../helpers';

const LOG_ANALYTICS_KEY = 'logAnalytics';

export enum AnalyticsStrategyEnum {
  BASIC = 'basic',
  EVENTS = 'events',
}

type CreateHttpLog = Omit<RequestLog, 'id'>;

/**
 * Analytics Logs Decorator & Interceptor
 *
 * Usage:
 *   1. Add @LogAnalytics() to a controller or route handler to enable analytics logging for that endpoint.
 *      - At the controller level: all routes in the controller will be logged.
 *      - At the method level: only that route will be logged.
 *   2. The AnalyticsLogsInterceptor is registered globally and will log requests to ClickHouse
 *      only for endpoints decorated with @LogAnalytics().
 *
 * Example (controller-level):
 *   @LogAnalytics()
 *   @Controller('events')
 *   export class EventsController { ... }
 *
 * Example (method-level):
 *   @Post('/trigger')
 *   @LogAnalytics()
 *   async trigger(...) { ... }
 *
 * Notes:
 *   - Logging is opt-in and non-intrusive.
 *   - The interceptor is extensible for future options (e.g., sampling, custom log fields).
 */

export function LogAnalytics(strategy: AnalyticsStrategyEnum = AnalyticsStrategyEnum.BASIC): MethodDecorator {
  return applyDecorators(SetMetadata(LOG_ANALYTICS_KEY, strategy));
}

function getAnalyticsStrategy(context: ExecutionContext): AnalyticsStrategyEnum {
  return context.getHandler && Reflect.getMetadata(LOG_ANALYTICS_KEY, context.getHandler());
}

function shouldLogAnalytics(context: ExecutionContext): boolean {
  return getAnalyticsStrategy(context) !== undefined;
}

@Injectable()
export class AnalyticsLogsInterceptor implements NestInterceptor {
  constructor(
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly requestLogRepository: RequestLogRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const shouldLog = shouldLogAnalytics(context);
    if (!shouldLog) return next.handle();

    const req = context.switchToHttp().getRequest();
    const user = req.user as UserSessionData;

    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_ANALYTICS_LOGS_ENABLED,
      user: { _id: user._id },
      organization: { _id: user.organizationId },
      environment: { _id: user.environmentId },
      defaultValue: false,
    });

    if (!isEnabled) return next.handle();

    const start = Date.now();

    const res = context.switchToHttp().getResponse();

    return next.handle().pipe(
      tap(async (data) => {
        const duration = Date.now() - start;
        const basicLog = this.buildLog(req, res, data, user, duration);
        const analyticsLog = this.buildLogByStrategy(context, basicLog, data);

        try {
          await retryWithBackoff(() => this.requestLogRepository.insert(analyticsLog));
        } catch (err) {
          this.logger.error({ err }, 'Failed to log analytics to ClickHouse after retries');
        }
      })
    );
  }

  private buildLogByStrategy(context: ExecutionContext, analyticsLog: CreateHttpLog, res: unknown): CreateHttpLog {
    const strategy = getAnalyticsStrategy(context);

    if (strategy === AnalyticsStrategyEnum.EVENTS) {
      const eventResponse = (res as any).data as TriggerEventResponseDto;

      if (eventResponse.transactionId) {
        return {
          ...analyticsLog,
          transaction_id: eventResponse.transactionId,
        };
      }
    }

    return analyticsLog;
  }

  private buildLog(req: any, res: any, data: any, user: UserSessionData, duration: number): CreateHttpLog {
    return {
      created_at: new Date(),
      path: req.path,
      url: req.originalUrl,
      url_pattern: req.route.path,
      hostname: req.hostname,
      status_code: res.statusCode,
      method: req.method,
      transaction_id: generateTransactionId(),
      ip: getClientIp(req) || '',
      user_agent: req.headers['user-agent'] || '',
      request_body: sanitizePayload(req.body),
      response_body: sanitizePayload(data),
      user_id: user._id,
      organization_id: user.organizationId,
      environment_id: user.environmentId,
      schema_type: user.scheme,
      duration_ms: duration,
    };
  }
}
