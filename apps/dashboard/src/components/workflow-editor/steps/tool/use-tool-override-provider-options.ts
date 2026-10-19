import { ChannelTypeEnum } from '@novu/shared';
import { useCallback, useMemo } from 'react';
import { type OverrideFieldSchema } from '@/components/workflow-editor/steps/shared/provider-overrides/override-field-schema';
import { type OverrideContentSource } from '@/components/workflow-editor/steps/shared/provider-overrides/override-source';
import { useProviderOverrideOptions } from '@/components/workflow-editor/steps/shared/provider-overrides/use-provider-override-options';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import {
  getActiveWebhookSchemaSources,
  type MergedWebhookPayloadSchema,
  mergeWebhookPayloadSchemas,
  type WebhookSchemaSource,
} from './webhook-payload-schema';

type WebhookOverrideSchema = {
  payloadSchema: MergedWebhookPayloadSchema;
  rootSchema: OverrideFieldSchema;
};

function toWebhookOverrideSchema(sources: WebhookSchemaSource[]): WebhookOverrideSchema {
  const payloadSchema = mergeWebhookPayloadSchemas(sources);

  return { payloadSchema, rootSchema: { type: 'object', properties: payloadSchema.properties } };
}

export function useToolOverrideProviderOptions() {
  const { currentEnvironment } = useEnvironment();
  const { integrations } = useFetchIntegrations();
  const { providerOptions, overrides } = useProviderOverrideOptions(ChannelTypeEnum.TOOL);

  // Built once per integrations fetch for stable identities: the override editor memoizes its
  // completion source and supported-field rows on the root schema, so a fresh object per render
  // would invalidate both on every keystroke.
  const webhookSchemas = useMemo(() => {
    const sources = getActiveWebhookSchemaSources(
      (integrations ?? []).filter(
        (integration) =>
          integration.channel === ChannelTypeEnum.TOOL && integration._environmentId === currentEnvironment?._id
      )
    );

    return {
      allIntegrations: toWebhookOverrideSchema(sources),
      byIdentifier: new Map(sources.map((source) => [source.identifier, toWebhookOverrideSchema([source])])),
      disconnected: toWebhookOverrideSchema([]),
    };
  }, [currentEnvironment?._id, integrations]);

  /** Every active webhook's merged schema, or one integration's own (empty once it is disconnected). */
  const getWebhookOverrideSchema = useCallback(
    (source: OverrideContentSource): WebhookOverrideSchema => {
      switch (source.kind) {
        case 'provider':
          return webhookSchemas.allIntegrations;
        case 'integration':
          return webhookSchemas.byIdentifier.get(source.integrationIdentifier) ?? webhookSchemas.disconnected;
        default: {
          const unhandled: never = source;

          return unhandled;
        }
      }
    },
    [webhookSchemas]
  );

  return { providerOptions, overrides, getWebhookOverrideSchema };
}
