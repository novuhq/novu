import {
  ChatProviderIdEnum,
  CONVERSATIONAL_PROVIDERS,
  type ConversationalProvider,
  FeatureFlagsKeysEnum,
} from '@novu/shared';
import { useMemo } from 'react';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

/**
 * Conversational channels the current organization is allowed to see.
 *
 * Web chat is not launched yet, so it stays out of every channel picker until
 * `IS_AGENT_WEB_CHAT_ENABLED` is on — the same flag that gates the subscriber `/v1/web-chat/*`
 * API. Read the list through this hook instead of `CONVERSATIONAL_PROVIDERS` directly so a
 * pre-release channel can never leak into the UI.
 */
export function useConversationalProviders(): ConversationalProvider[] {
  const isWebChatEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_AGENT_WEB_CHAT_ENABLED);

  return useMemo(
    () =>
      CONVERSATIONAL_PROVIDERS.filter(
        (provider) => isWebChatEnabled || provider.providerId !== ChatProviderIdEnum.NovuWebChat
      ),
    [isWebChatEnabled]
  );
}
