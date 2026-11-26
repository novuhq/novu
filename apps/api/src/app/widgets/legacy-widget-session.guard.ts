import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubscriberSessionAuthMethodEnum } from '@novu/shared';
import type { SubscriberSession } from '../shared/framework/user.decorator';

/**
 * The legacy widget routes do not filter by context, so a token session, whose context must come only from its
 * token, is refused here. Token sessions use the `/v1/inbox` routes.
 */
@Injectable()
export class LegacyWidgetSessionGuard extends AuthGuard('subscriberJwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);

    const session: SubscriberSession = context.switchToHttp().getRequest().user;
    if (session.authMethod === SubscriberSessionAuthMethodEnum.TOKEN) {
      throw new UnauthorizedException('Token sessions are not supported on the legacy widget API.');
    }

    return true;
  }
}
