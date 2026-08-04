import { ChannelTypeEnum, ChatProviderIdEnum, type IIntegration, providers } from '@novu/shared';
import { useMemo } from 'react';

import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';

export type ChatPreviewProviderOption = {
  providerId: string;
  displayName: string;
  /** Whether an active chat integration exists for this provider in the current environment. */
  isConnected: boolean;
};

export type ChatPreviewProviders = {
  options: ChatPreviewProviderOption[];
  defaultProviderId: string;
  /** True until the environment's integrations have been fetched at least once. */
  isLoading: boolean;
};

/**
 * Sentinel option that renders a provider-agnostic "Default preview" shell. Always the first option
 * and the default selection, so the preview never assumes a specific platform before one is picked.
 */
export const DEFAULT_PREVIEW_PROVIDER_ID = 'default-preview';

const DEFAULT_PREVIEW_OPTION: ChatPreviewProviderOption = {
  providerId: DEFAULT_PREVIEW_PROVIDER_ID,
  displayName: 'Default preview',
  isConnected: true,
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
  const connectedProviderIds = new Set<string>();
  const seen = new Set<string>();
  const options: ChatPreviewProviderOption[] = [];

  for (const integration of integrations ?? []) {
    if (
      integration.active &&
      !integration.deleted &&
      integration.channel === ChannelTypeEnum.CHAT &&
      integration._environmentId === environmentId
    ) {
      connectedProviderIds.add(integration.providerId);

      if (!seen.has(integration.providerId)) {
        seen.add(integration.providerId);
        options.push({
          providerId: integration.providerId,
          displayName: getProviderDisplayName(integration.providerId),
          isConnected: true,
        });
      }
    }
  }

  for (const providerId of ALWAYS_AVAILABLE_PROVIDER_IDS) {
    if (!seen.has(providerId)) {
      seen.add(providerId);
      options.push({
        providerId,
        displayName: getProviderDisplayName(providerId),
        isConnected: connectedProviderIds.has(providerId),
      });
    }
  }

  options.sort(compareProviderOptions);

  // "Default preview" always leads and is the default selection, regardless of connected providers.
  return { options: [DEFAULT_PREVIEW_OPTION, ...options], defaultProviderId: DEFAULT_PREVIEW_PROVIDER_ID };
}

/**
 * Chat providers configured on the current environment, scoping the preview platform dropdown to
 * what the environment actually delivers to. Always leads with a provider-agnostic "Default preview"
 * option (the default selection) and flags whether each provider has an active integration.
 */
export function useConfiguredChatProviders(): ChatPreviewProviders {
  const { currentEnvironment } = useEnvironment();
  const { integrations, isPending } = useFetchIntegrations();

  return useMemo(() => {
    const providers = buildChatPreviewProviders(integrations, currentEnvironment?._id);

    return { ...providers, isLoading: isPending };
  }, [integrations, currentEnvironment?._id, isPending]);
}
