import {
  applyDecorators,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PinoLogger, RequestLog, RequestLogRepository } from '@novu/application-generic';
import { UserSessionData } from '@novu/shared';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TriggerEventResponseDto } from '../../events/dtos/trigger-event-response.dto';
import { buildLog } from '../utils/mappers';

const LOG_ANALYTICS_KEY = 'logAnalytics';

export enum AnalyticsStrategyEnum {
  BASIC = 'basic',
  EVENTS = 'events',
  EVENTS_BULK = 'events_bulk',
}

export function LogAnalytics(strategy: AnalyticsStrategyEnum = AnalyticsStrategyEnum.BASIC): MethodDecorator {
  return applyDecorators(SetMetadata(LOG_ANALYTICS_KEY, strategy));
}

@Injectable()
export class AnalyticsLogsInterceptor implements NestInterceptor {
  constructor(
    private readonly requestLogRepository: RequestLogRepository,
    private readonly logger: PinoLogger,
    private readonly reflector: Reflector
  ) {
    this.logger.setContext(this.constructor.name);
  }

  private shouldLogAnalytics(context: ExecutionContext): boolean {
    const strategy = this.getAnalyticsStrategy(context);

    this.logger.debug(`Analytics logs should log strategy: ${strategy}`);

    return strategy !== undefined;
  }

  private getAnalyticsStrategy(context: ExecutionContext): AnalyticsStrategyEnum {
    const globalHandler = context.getHandler && Reflect.getMetadata(LOG_ANALYTICS_KEY, context.getHandler());
    const handlerMetadata = this.reflector.get(LOG_ANALYTICS_KEY, context.getHandler());
    const handler = context.getHandler();
    const customDecorator = handler && (handler as any)._analyticsStrategy;

    this.logger.debug(`Analytics logs globalHandler strategy: ${globalHandler}`);
    this.logger.debug(`Analytics logs handlerMetadata strategy: ${handlerMetadata}`);
    this.logger.debug(`Analytics logs customDecorator strategy: ${customDecorator}`);

    return globalHandler || handlerMetadata || customDecorator;
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const shouldRun = await this.shouldRun(context);

    this.logger.debug(`Analytics logs should run LOG_ANALYTICS_KEY: ${shouldRun}`);

    if (!shouldRun) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user as UserSessionData;
    const start = Date.now();
    const res = context.switchToHttp().getResponse();

    this.logger.debug('Analytics logs interceptor started');

    return next.handle().pipe(
      tap(async (data) => {
        const duration = Date.now() - start;
        const basicLog = buildLog(req, res.statusCode, data, user, duration);
        if (!basicLog) {
          this.logger.warn('Analytics log construction failed - unable to track request metrics');

          return;
        }

        const analyticsLog = this.buildLogByStrategy(context, basicLog, data);

        try {
          this.logger.debug({ analyticsLog }, 'Analytics log Inserting');
          await this.requestLogRepository.create(analyticsLog, {
            organizationId: user?.organizationId,
            environmentId: user?.environmentId,
            userId: user?._id,
          });
          this.logger.debug('Analytics log Inserted');
        } catch (err) {
          this.logger.error({ err }, 'Failed to log analytics to ClickHouse after retries');
        }
      })
    );
  }

  private async shouldRun(context: ExecutionContext): Promise<boolean> {
    const shouldLog = this.shouldLogAnalytics(context);

    if (!shouldLog) return false;

    const isEnabled = process.env.IS_ANALYTICS_LOGS_ENABLED === 'true';

    this.logger.debug(
      `Analytics logs should run IS_ANALYTICS_LOGS_ENABLED: ${process.env.IS_ANALYTICS_LOGS_ENABLED}, isEnabled: ${isEnabled}`
    );

    if (!isEnabled) return false;

    return true;
  }

  private buildLogByStrategy(
    context: ExecutionContext,
    analyticsLog: Omit<RequestLog, 'expires_at'>,
    res: unknown
  ): Omit<RequestLog, 'expires_at'> {
    const strategy = this.getAnalyticsStrategy(context);

    if (strategy === AnalyticsStrategyEnum.EVENTS) {
      const eventResponse = (res as any).data as TriggerEventResponseDto;

      if (eventResponse.transactionId) {
        return {
          ...analyticsLog,
          transaction_id: eventResponse.transactionId,
        };
      }
    }

    if (strategy === AnalyticsStrategyEnum.EVENTS_BULK) {
      const bulkEventResponse = (res as any).data as TriggerEventResponseDto[];

      if (Array.isArray(bulkEventResponse)) {
        const transactionIds = bulkEventResponse
          .map((response) => response.transactionId)
          .filter(Boolean)
          .join(',');

        if (transactionIds) {
          return {
            ...analyticsLog,
            transaction_id: transactionIds,
          };
        }
      }
    }

    return analyticsLog;
  }
}
