import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { PinoLogger, storage } from '@novu/application-generic';
import { UserSessionData } from '@novu/shared';
import { Observable } from 'rxjs';
import { addNewRelicTraceAttributes } from '../../auth/services/passport/newrelic.util';

type SessionRequest = {
  user?: Pick<UserSessionData, 'organizationId' | 'environmentId'>;
};

/**
 * Adds the authenticated organization and environment to the request's log lines (including the exception filter's)
 * and to its New Relic transaction, whichever auth strategy created the session. Runs after all guards, so lines
 * logged inside a guard and requests without a session are left as they are.
 */
@Injectable()
export class TelemetryContextInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const { user } = context.switchToHttp().getRequest<SessionRequest>();

    if (!user?.organizationId) {
      return next.handle();
    }

    addNewRelicTraceAttributes(user);

    // `assign` throws outside the nestjs-pino request scope, e.g. on routes the logger middleware excludes
    if (storage.getStore()) {
      this.logger.assign({
        organizationId: user.organizationId,
        ...(user.environmentId && { environmentId: user.environmentId }),
      });
    }

    return next.handle();
  }
}
