import { ChatProviderIdEnum } from '@novu/shared';
import { CardElement, IChatRenderValidation } from '@novu/stateless';
import { validateTeamsCard } from './msTeams/card-render.utils';
import { validateSlackCard } from './slack/card-render.utils';
import { validateTelegramCard } from './telegram/card-render.utils';
import { validateWhatsAppCard } from './whatsapp-business/card-render.utils';

export type ChatCardValidator = (card: CardElement) => IChatRenderValidation[];

/**
 * Rich Chat: the deterministic, platform-limit card validators keyed by the rich providers with a
 * native serializer (Slack, Teams, Telegram, WhatsApp). Exposed standalone so validation can run
 * without instantiating a provider (e.g. at workflow-save time to surface card issues in the editor)
 * and mirror the `validation` a provider's `render()` returns. Each finding carries a `level`:
 * `ERROR` findings (Slack's API-enforced Block Kit limits) block save because delivery fails;
 * `WARNING` findings (Teams/Telegram/WhatsApp degradation) are non-blocking. Markdown-fallback
 * providers (Discord, Rocket.Chat, ...) have no native limits and are omitted.
 */
const CHAT_CARD_VALIDATORS: Partial<Record<ChatProviderIdEnum, ChatCardValidator>> = {
  [ChatProviderIdEnum.Slack]: validateSlackCard,
  [ChatProviderIdEnum.MsTeams]: validateTeamsCard,
  [ChatProviderIdEnum.Telegram]: validateTelegramCard,
  [ChatProviderIdEnum.WhatsAppBusiness]: validateWhatsAppCard,
};

/** Returns the card validator for a chat provider, or `undefined` when the provider has no limits. */
export function getChatCardValidator(providerId: string): ChatCardValidator | undefined {
  return CHAT_CARD_VALIDATORS[providerId as ChatProviderIdEnum];
}
