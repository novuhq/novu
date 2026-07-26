import { ChannelTypeEnum } from '@novu/shared';
import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import {
  buildToolOverrideProviderOptions,
  isToolContentOverrideProviderId,
  type ToolProviderOverrides,
} from './tool-content-source';
import { getActiveWebhookSchemaSources, mergeWebhookPayloadSchemas } from './webhook-payload-schema';

const PROVIDER_OVERRIDES_FIELD = 'providerOverrides';

export function useToolOverrideProviderOptions() {
  const { currentEnvironment } = useEnvironment();
  const { integrations } = useFetchIntegrations();
  const { watch } = useFormContext();
  const providerOverrides = watch(PROVIDER_OVERRIDES_FIELD) as ToolProviderOverrides | undefined;

  const providerOptions = useMemo(() => {
    const activeProviderIds = new Set<string>();

    for (const integration of integrations ?? []) {
      if (
        integration.active &&
        !integration.deleted &&
        integration.channel === ChannelTypeEnum.TOOL &&
        integration._environmentId === currentEnvironment?._id &&
        isToolContentOverrideProviderId(integration.providerId)
      ) {
        activeProviderIds.add(integration.providerId);
      }
    }

    return buildToolOverrideProviderOptions({
      activeProviderIds,
      providerOverrides,
    });
  }, [integrations, currentEnvironment?._id, providerOverrides]);

  const webhookPayloadSchema = useMemo(() => {
    const environmentIntegrations = (integrations ?? []).filter(
      (integration) =>
        integration.channel === ChannelTypeEnum.TOOL && integration._environmentId === currentEnvironment?._id
    );

    return mergeWebhookPayloadSchemas(getActiveWebhookSchemaSources(environmentIntegrations));
  }, [currentEnvironment?._id, integrations]);

  return { providerOptions, providerOverrides, webhookPayloadSchema };
}
