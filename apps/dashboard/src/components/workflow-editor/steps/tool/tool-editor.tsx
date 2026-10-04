import { ChannelTypeEnum, ToolProviderIdEnum, type UiSchema } from '@novu/shared';
import { useCallback } from 'react';
import { RiLightbulbLine } from 'react-icons/ri';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import {
  ContentOverridePanel,
  type ProviderOverrideEditorExtras,
} from '@/components/workflow-editor/steps/shared/provider-overrides/content-override-panel';
import { type OverrideContentSource } from '@/components/workflow-editor/steps/shared/provider-overrides/content-source';
import { useToolOverrideProviderOptions } from './use-tool-override-provider-options';
import { annotateWebhookField, describeWebhookField } from './webhook-override-annotations';
import { formatWebhookSchemaSourceLabel, type WebhookSchemaSourceRef } from './webhook-payload-schema';

type ToolEditorProps = { uiSchema: UiSchema };

function WebhookOverrideNotice({
  isIntegrationOverride,
  ignoredSources,
}: {
  isIntegrationOverride: boolean;
  ignoredSources: WebhookSchemaSourceRef[];
}) {
  return (
    <div className="text-text-soft flex items-start gap-1">
      <RiLightbulbLine className="mt-0.5 size-3 shrink-0" />
      <span className="min-w-0 flex-1 text-xs">
        {isIntegrationOverride ? (
          'Sent only to this integration, which merges its own body template beneath the merged payload.'
        ) : (
          <>
            Non-empty JSON replaces default content and is sent to every active webhook integration. Each integration
            merges its own body template beneath this payload. Empty <code>{'{}'}</code> uses default content.
          </>
        )}
        {ignoredSources.length > 0 && (
          <> Autocomplete is unavailable for: {ignoredSources.map(formatWebhookSchemaSourceLabel).join(', ')}.</>
        )}
      </span>
    </div>
  );
}

export const ToolEditor = (props: ToolEditorProps) => {
  const { uiSchema } = props;
  const { body } = uiSchema?.properties ?? {};
  const { providerOptions, overrides, getWebhookOverrideSchema } = useToolOverrideProviderOptions();

  const getEditorExtras = useCallback(
    ({ providerId, integrationIdentifier }: OverrideContentSource): ProviderOverrideEditorExtras => {
      if (providerId !== ToolProviderIdEnum.Webhook) {
        return {};
      }

      const { payloadSchema, rootSchema } = getWebhookOverrideSchema(integrationIdentifier);

      return {
        rootSchemaOverride: rootSchema,
        describeField: describeWebhookField,
        annotateField: annotateWebhookField,
        headerTooltip: 'Webhook overrides replace default content and accept arbitrary JSON object keys.',
        placeholder: '{\n  "event": "{{payload.title}}"\n}',
        notice: (
          <WebhookOverrideNotice
            isIntegrationOverride={integrationIdentifier !== undefined}
            ignoredSources={payloadSchema.ignoredSources}
          />
        ),
      };
    },
    [getWebhookOverrideSchema]
  );

  return (
    <ContentOverridePanel
      channel={ChannelTypeEnum.TOOL}
      providerOptions={providerOptions}
      overrides={overrides}
      defaultContent={body ? getComponentByType({ component: body.component }) : null}
      getEditorExtras={getEditorExtras}
    />
  );
};
