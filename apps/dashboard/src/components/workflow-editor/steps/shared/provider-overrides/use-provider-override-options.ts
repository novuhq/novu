import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import {
  buildProviderOverrideOptions,
  isContentOverrideProviderId,
  type OverrideChannel,
  PROVIDER_OVERRIDES_FIELD,
  type ProviderOverrides,
} from './content-source';

/**
 * Override tabs are driven by the integrations actually enabled in the current environment, plus
 * any provider that already carries an override so stored data is never stranded.
 */
export function useProviderOverrideOptions(channel: OverrideChannel) {
  const { currentEnvironment } = useEnvironment();
  const { integrations } = useFetchIntegrations();
  const { watch } = useFormContext();
  const providerOverrides = watch(PROVIDER_OVERRIDES_FIELD) as ProviderOverrides | undefined;

  const providerOptions = useMemo(() => {
    const activeProviderIds = new Set<string>();

    for (const integration of integrations ?? []) {
      if (
        integration.active &&
        !integration.deleted &&
        integration.channel === channel &&
        integration._environmentId === currentEnvironment?._id &&
        isContentOverrideProviderId(channel, integration.providerId)
      ) {
        activeProviderIds.add(integration.providerId);
      }
    }

    return buildProviderOverrideOptions({
      channel,
      activeProviderIds,
      providerOverrides,
    });
  }, [channel, integrations, currentEnvironment?._id, providerOverrides]);

  return { providerOptions, providerOverrides };
}
