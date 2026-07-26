import { ChannelTypeEnum } from '@novu/shared';
import { useMemo } from 'react';
import { type OverrideFieldSchema } from '@/components/workflow-editor/steps/shared/provider-overrides/override-field-schema';
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

  // Stable identity: the override editor memoizes its completion source and supported-field rows
  // on this object, so a fresh wrapper per render would invalidate both on every keystroke.
  const webhookRootSchema = useMemo(
    (): OverrideFieldSchema => ({ type: 'object', properties: webhookPayloadSchema.properties }),
    [webhookPayloadSchema]
  );

  return { providerOptions, providerOverrides, webhookPayloadSchema, webhookRootSchema };
}
