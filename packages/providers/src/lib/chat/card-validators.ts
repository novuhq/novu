import { ChatProviderIdEnum } from '@novu/shared';
import { CardElement, IChatRenderValidation } from '@novu/stateless';
import { validateTeamsCard } from './msTeams/card-render.utils';
import { validateSlackCard } from './slack/card-render.utils';

export type ChatCardValidator = (card: CardElement) => IChatRenderValidation[];

/**
 * Rich Chat: the deterministic, platform-limit card validators keyed by provider. These mirror the
 * `validation` a provider's `render()` returns, but are exposed standalone so validation can run
 * without instantiating a provider (e.g. at workflow-save time to surface card issues in the editor).
 * Providers without platform limits (Telegram, WhatsApp, markdown-fallback providers) are omitted.
 */
const CHAT_CARD_VALIDATORS: Partial<Record<ChatProviderIdEnum, ChatCardValidator>> = {
  [ChatProviderIdEnum.Slack]: validateSlackCard,
  [ChatProviderIdEnum.MsTeams]: validateTeamsCard,
};

/** Returns the card validator for a chat provider, or `undefined` when the provider has no limits. */
export function getChatCardValidator(providerId: string): ChatCardValidator | undefined {
  return CHAT_CARD_VALIDATORS[providerId as ChatProviderIdEnum];
}
