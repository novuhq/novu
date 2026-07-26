import {
  ChannelTypeEnum,
  type ContentOverrideProviderId,
  EnvironmentTypeEnum,
  ToolProviderIdEnum,
  type UiSchema,
} from '@novu/shared';
import { useCallback } from 'react';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import {
  ContentOverridePanel,
  type ProviderOverrideEditorExtras,
} from '@/components/workflow-editor/steps/shared/provider-overrides/content-override-panel';
import { useEnvironment } from '@/context/environment/hooks';
import { StepEditorUnavailable } from '../step-editor-unavailable';
import { useToolOverrideProviderOptions } from './use-tool-override-provider-options';
import { annotateWebhookField, describeWebhookField } from './webhook-override-annotations';
import { formatWebhookSchemaSourceLabel } from './webhook-payload-schema';

type ToolEditorProps = { uiSchema: UiSchema };

export const ToolEditor = (props: ToolEditorProps) => {
  const { currentEnvironment } = useEnvironment();
  const { uiSchema } = props;
  const { body } = uiSchema?.properties ?? {};
  const { providerOptions, providerOverrides, webhookPayloadSchema, webhookRootSchema } =
    useToolOverrideProviderOptions();

  const getEditorExtras = useCallback(
    (providerId: ContentOverrideProviderId): ProviderOverrideEditorExtras => {
      if (providerId !== ToolProviderIdEnum.Webhook) {
        return {};
      }

      const { ignoredSources } = webhookPayloadSchema;

      return {
        rootSchemaOverride: webhookRootSchema,
        describeField: describeWebhookField,
        annotateField: annotateWebhookField,
        headerTooltip: 'Webhook overrides replace default content and accept arbitrary JSON object keys.',
        placeholder: '{\n  "event": "{{payload.title}}"\n}',
        notice: (
          <span className="text-xs">
            Non-empty JSON replaces default content and is sent to every active webhook integration. Each integration
            merges its own body template beneath this payload. Empty <code>{'{}'}</code> uses default content.
            {ignoredSources.length > 0 && (
              <> Autocomplete is unavailable for: {ignoredSources.map(formatWebhookSchemaSourceLabel).join(', ')}.</>
            )}
          </span>
        ),
      };
    },
    [webhookPayloadSchema, webhookRootSchema]
  );

  if (currentEnvironment?.type !== EnvironmentTypeEnum.DEV) {
    return <StepEditorUnavailable />;
  }

  return (
    <ContentOverridePanel
      channel={ChannelTypeEnum.TOOL}
      providerOptions={providerOptions}
      providerOverrides={providerOverrides}
      defaultContent={body ? getComponentByType({ component: body.component }) : null}
      getEditorExtras={getEditorExtras}
    />
  );
};
