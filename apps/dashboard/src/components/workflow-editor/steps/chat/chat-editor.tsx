import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  type ContentOverrideProviderId,
  EnvironmentTypeEnum,
  FeatureFlagsKeysEnum,
  UiComponentEnum,
  type UiSchema,
} from '@novu/shared';
import { type ReactNode, useCallback } from 'react';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import {
  ContentOverridePanel,
  type ProviderOverrideEditorExtras,
} from '@/components/workflow-editor/steps/shared/provider-overrides/content-override-panel';
import { SlackBlockKitBuilderHint } from '@/components/workflow-editor/steps/shared/provider-overrides/slack-block-kit-builder-hint';
import { useProviderOverrideOptions } from '@/components/workflow-editor/steps/shared/provider-overrides/use-provider-override-options';
import { TabsSection } from '@/components/workflow-editor/steps/tabs-section';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { StepEditorUnavailable } from '../step-editor-unavailable';

type ChatEditorProps = { uiSchema: UiSchema };

function ChatEditorSelectAction({ editorTypeComponent }: { editorTypeComponent?: UiComponentEnum }) {
  return (
    <div className="flex items-center">
      {getComponentByType({ component: editorTypeComponent ?? UiComponentEnum.CHAT_EDITOR_SELECT })}
    </div>
  );
}

/** Split out so the flag-off editor never subscribes to the `providerOverrides` form field. */
function ChatOverrideEditor({
  defaultContent,
  defaultContentActions,
}: {
  defaultContent: ReactNode;
  defaultContentActions?: ReactNode;
}) {
  const { providerOptions, providerOverrides } = useProviderOverrideOptions(ChannelTypeEnum.CHAT);

  const getEditorExtras = useCallback((providerId: ContentOverrideProviderId): ProviderOverrideEditorExtras => {
    if (providerId !== ChatProviderIdEnum.Slack) {
      return {};
    }

    return {
      notice: ({ parsedDraft }) => <SlackBlockKitBuilderHint override={parsedDraft} />,
    };
  }, []);

  return (
    <ContentOverridePanel
      channel={ChannelTypeEnum.CHAT}
      providerOptions={providerOptions}
      providerOverrides={providerOverrides}
      defaultContent={defaultContent}
      defaultContentActions={defaultContentActions}
      showEscapeHatchBadge
      getEditorExtras={getEditorExtras}
    />
  );
}

export const ChatEditor = (props: ChatEditorProps) => {
  const { currentEnvironment } = useEnvironment();
  const { uiSchema } = props;
  const { body, editorType } = uiSchema?.properties ?? {};
  const areProviderOverridesEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CHAT_PROVIDER_OVERRIDES_ENABLED);
  const isBlockEditorEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CHAT_BLOCK_EDITOR_ENABLED);

  if (currentEnvironment?.type !== EnvironmentTypeEnum.DEV) {
    return <StepEditorUnavailable />;
  }

  const defaultContent = body ? getComponentByType({ component: body.component }) : null;
  const defaultContentActions = isBlockEditorEnabled ? (
    <ChatEditorSelectAction editorTypeComponent={editorType?.component} />
  ) : undefined;

  if (areProviderOverridesEnabled) {
    return <ChatOverrideEditor defaultContent={defaultContent} defaultContentActions={defaultContentActions} />;
  }

  if (defaultContentActions) {
    return (
      <div className="-mx-3 -mt-3 flex h-full min-h-0 flex-col">
        <TabsSection className="flex min-h-0 flex-1 flex-col p-3">
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex shrink-0 items-center justify-end">{defaultContentActions}</div>
            <div className="rounded-12 bg-bg-weak flex min-h-0 flex-1 flex-col gap-2 border border-neutral-100 p-2">
              {defaultContent}
            </div>
          </div>
        </TabsSection>
      </div>
    );
  }

  return <div className="flex h-full flex-col">{defaultContent}</div>;
};
