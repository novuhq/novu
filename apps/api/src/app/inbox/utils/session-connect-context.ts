import { ContextPayload, SubscriberSessionAuthMethodEnum } from '@novu/shared';
import { SubscriberSession } from '../../shared/framework/user.decorator';

export function sessionConnectContext(
  session: SubscriberSession,
  body: { context?: ContextPayload; contextHash?: string }
) {
  if (session.authMethod === SubscriberSessionAuthMethodEnum.TOKEN) {
    return { contextKeys: session.contextKeys, isContextValidated: true };
  }

  return {
    context: body.context,
    contextKeys: session.contextKeys,
    contextHash: body.contextHash,
    isContextValidated: !!session.contextKeys?.length,
  };
}
