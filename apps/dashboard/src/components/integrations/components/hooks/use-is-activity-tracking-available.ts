import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

/**
 * Whether activity tracking can be set up here. The same flags show or hide tracking in the integration's
 * settings, where the webhook URL is copied from, so tracking is only offered when that URL can be reached.
 */
export function useIsActivityTrackingAvailable(): boolean {
  const isInboundWebhooksEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_INBOUND_WEBHOOKS_ENABLED, true);
  const isInboundWebhooksConfigurationEnabled = useFeatureFlag(
    FeatureFlagsKeysEnum.IS_INBOUND_WEBHOOKS_CONFIGURATION_ENABLED,
    false
  );

  return isInboundWebhooksEnabled && isInboundWebhooksConfigurationEnabled;
}
