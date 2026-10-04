import { ChannelTypeEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { useMemo } from 'react';
import { type FieldValues, type UseFormGetValues, useFormContext } from 'react-hook-form';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import {
  type ActiveOverrideIntegration,
  buildProviderOverrideOptions,
  INTEGRATION_OVERRIDES_FIELD,
  type IntegrationOverrides,
  isContentOverrideProviderId,
  type OverrideChannel,
  type OverrideValues,
  PROVIDER_OVERRIDES_FIELD,
  type ProviderOverrides,
} from './content-source';

/** Chat steps only offer overrides at all behind the chat provider-overrides flag. */
function useAreIntegrationOverridesEnabled(channel: OverrideChannel): boolean {
  const isIntegrationFlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_INTEGRATION_CONTENT_OVERRIDES_ENABLED);
  const isChatFlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CHAT_PROVIDER_OVERRIDES_ENABLED);

  return isIntegrationFlagEnabled && (channel !== ChannelTypeEnum.CHAT || isChatFlagEnabled);
}

export function readOverrideValues(getValues: UseFormGetValues<FieldValues>): OverrideValues {
  return {
    providerOverrides: getValues(PROVIDER_OVERRIDES_FIELD),
    integrationOverrides: getValues(INTEGRATION_OVERRIDES_FIELD),
  };
}

/**
 * The override form fields. While integration overrides are disabled `integrationOverrides` is never
 * watched and reads as undefined, so every consumer behaves as if only provider overrides existed.
 */
export function useOverrideValues(channel: OverrideChannel) {
  const { watch } = useFormContext();
  const areIntegrationOverridesEnabled = useAreIntegrationOverridesEnabled(channel);
  const providerOverrides = watch(PROVIDER_OVERRIDES_FIELD) as ProviderOverrides | null | undefined;
  const integrationOverrides = areIntegrationOverridesEnabled
    ? (watch(INTEGRATION_OVERRIDES_FIELD) as IntegrationOverrides | null | undefined)
    : undefined;

  const overrides = useMemo(
    (): OverrideValues => ({ providerOverrides, integrationOverrides }),
    [providerOverrides, integrationOverrides]
  );

  return { overrides, areIntegrationOverridesEnabled };
}

/**
 * Override tabs are driven by the integrations actually enabled in the current environment, plus
 * any provider or integration that already carries an override so stored data is never stranded.
 */
export function useProviderOverrideOptions(channel: OverrideChannel) {
  const { currentEnvironment } = useEnvironment();
  const { integrations } = useFetchIntegrations();
  const { overrides, areIntegrationOverridesEnabled } = useOverrideValues(channel);

  const providerOptions = useMemo(() => {
    const activeIntegrations: ActiveOverrideIntegration[] = (integrations ?? []).filter(
      (integration) =>
        integration.active &&
        !integration.deleted &&
        integration.channel === channel &&
        integration._environmentId === currentEnvironment?._id &&
        isContentOverrideProviderId(channel, integration.providerId)
    );

    return buildProviderOverrideOptions({
      channel,
      activeIntegrations,
      providerOverrides: overrides.providerOverrides,
      integrationOverrides: overrides.integrationOverrides,
      includeIntegrationOptions: areIntegrationOverridesEnabled,
    });
  }, [channel, integrations, currentEnvironment?._id, overrides, areIntegrationOverridesEnabled]);

  return { providerOptions, overrides };
}
