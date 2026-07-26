import { ChannelTypeEnum } from '@novu/shared';
import { useMemo } from 'react';
import { useProviderOverrideOptions } from '@/components/workflow-editor/steps/shared/provider-overrides/use-provider-override-options';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { TOOL_OVERRIDE_CHANNEL } from './tool-content-source';
import { getActiveWebhookSchemaSources, mergeWebhookPayloadSchemas } from './webhook-payload-schema';

export function useToolOverrideProviderOptions() {
  const { currentEnvironment } = useEnvironment();
  const { integrations } = useFetchIntegrations();
  const { providerOptions, providerOverrides } = useProviderOverrideOptions(TOOL_OVERRIDE_CHANNEL);

  const webhookPayloadSchema = useMemo(() => {
    const environmentIntegrations = (integrations ?? []).filter(
      (integration) =>
        integration.channel === ChannelTypeEnum.TOOL && integration._environmentId === currentEnvironment?._id
    );

    return mergeWebhookPayloadSchemas(getActiveWebhookSchemaSources(environmentIntegrations));
  }, [currentEnvironment?._id, integrations]);

  return { providerOptions, providerOverrides, webhookPayloadSchema };
}
