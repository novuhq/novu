import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { UserSessionData } from '@novu/shared';
import { Observable } from 'rxjs';

let nr: any;

try {
  nr = require('newrelic');
} catch {
  nr = null;
}

@Injectable()
export class NewRelicTraceAttributesInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!nr) return next.handle();

    const req = context.switchToHttp().getRequest();
    const user = req?.user as UserSessionData | undefined;

    if (user) {
      nr.addCustomAttributes({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
      });
    }

    return next.handle();
  }
}
