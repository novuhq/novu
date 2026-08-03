import { ChannelTypeEnum, ChatProviderIdEnum, type IIntegration, providers } from '@novu/shared';
import { useMemo } from 'react';

import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';

export type ChatPreviewProviderOption = {
  providerId: string;
  displayName: string;
};

export type ChatPreviewProviders = {
  options: ChatPreviewProviderOption[];
  defaultProviderId: string;
};

/** Preferred provider ordering in the preview dropdown; everything else follows alphabetically. */
const PROVIDER_ORDER: readonly string[] = [
  ChatProviderIdEnum.Slack,
  ChatProviderIdEnum.MsTeams,
  ChatProviderIdEnum.Telegram,
  ChatProviderIdEnum.WhatsAppBusiness,
];

/**
 * Providers with a dedicated preview shell are always offered in the dropdown, regardless of which
 * chat integrations are connected, so the preview never collapses to a single (or missing) option.
 */
const ALWAYS_AVAILABLE_PROVIDER_IDS: readonly string[] = [ChatProviderIdEnum.Slack, ChatProviderIdEnum.MsTeams];

export function getProviderDisplayName(providerId: string): string {
  return providers.find((provider) => provider.id === providerId)?.displayName ?? providerId;
}

function compareProviderOptions(left: ChatPreviewProviderOption, right: ChatPreviewProviderOption): number {
  const leftRank = PROVIDER_ORDER.indexOf(left.providerId);
  const rightRank = PROVIDER_ORDER.indexOf(right.providerId);
  const leftIndex = leftRank === -1 ? PROVIDER_ORDER.length : leftRank;
  const rightIndex = rightRank === -1 ? PROVIDER_ORDER.length : rightRank;

  if (leftIndex !== rightIndex) {
    return leftIndex - rightIndex;
  }

  return left.displayName.localeCompare(right.displayName);
}

function buildChatPreviewProviders(
  integrations: IIntegration[] | undefined,
  environmentId: string | undefined
): ChatPreviewProviders {
  const seen = new Set<string>();
  const options: ChatPreviewProviderOption[] = [];

  for (const integration of integrations ?? []) {
    if (
      integration.active &&
      !integration.deleted &&
      integration.channel === ChannelTypeEnum.CHAT &&
      integration._environmentId === environmentId &&
      !seen.has(integration.providerId)
    ) {
      seen.add(integration.providerId);
      options.push({
        providerId: integration.providerId,
        displayName: getProviderDisplayName(integration.providerId),
      });
    }
  }

  for (const providerId of ALWAYS_AVAILABLE_PROVIDER_IDS) {
    if (!seen.has(providerId)) {
      seen.add(providerId);
      options.push({ providerId, displayName: getProviderDisplayName(providerId) });
    }
  }

  options.sort(compareProviderOptions);

  const defaultProviderId =
    options.find((option) => option.providerId === ChatProviderIdEnum.Slack)?.providerId ?? options[0].providerId;

  return { options, defaultProviderId };
}

/**
 * Chat providers configured on the current environment, scoping the preview platform dropdown to
 * what the environment actually delivers to. Falls back to Slack so the preview still renders before
 * any chat integration is connected, and prefers Slack as the default when available.
 */
export function useConfiguredChatProviders(): ChatPreviewProviders {
  const { currentEnvironment } = useEnvironment();
  const { integrations } = useFetchIntegrations();

  return useMemo(
    () => buildChatPreviewProviders(integrations, currentEnvironment?._id),
    [integrations, currentEnvironment?._id]
  );
}
