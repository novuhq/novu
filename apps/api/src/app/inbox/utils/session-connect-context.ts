import { ContextPayload, SubscriberSessionAuthMethodEnum } from '@novu/shared';
import { SubscriberSession } from '../../shared/framework/user.decorator';

/**
 * Context for the chat connect and link routes. A token session's context comes only from its token.
 * Any other session that carries resolved `contextKeys` is the trusted context source; the raw `body.context`
 * is only used (and re-verified via `contextHash`) when the session has none.
 */
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
