import { FeatureFlagsKeysEnum, IProviderConfig, providers } from '@novu/shared';
import { useMemo } from 'react';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { isChannelVisibleInUi } from '@/utils/channels';

type ResolvedProviderDeprecation = {
  reason: string;
  /**
   * Only set when the replacement sits on a channel this organization can see,
   * so we never render a CTA that leads into a channel hidden from the UI.
   */
  replacement?: IProviderConfig;
};

export function useProviderDeprecation(provider?: IProviderConfig): ResolvedProviderDeprecation | undefined {
  const isToolChannelEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_TOOL_CHANNEL_ENABLED);

  return useMemo(() => {
    const deprecated = provider?.deprecated;

    if (!deprecated) {
      return undefined;
    }

    const replacement = providers.find((candidate) => candidate.id === deprecated.replacedBy);

    return {
      reason: deprecated.reason,
      replacement: isChannelVisibleInUi(replacement?.channel, isToolChannelEnabled) ? replacement : undefined,
    };
  }, [provider?.deprecated, isToolChannelEnabled]);
}
