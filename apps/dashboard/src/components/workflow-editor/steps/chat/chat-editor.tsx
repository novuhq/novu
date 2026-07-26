import { ChannelTypeEnum, EnvironmentTypeEnum, FeatureFlagsKeysEnum, type UiSchema } from '@novu/shared';
import { type ReactNode } from 'react';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { ContentOverridePanel } from '@/components/workflow-editor/steps/shared/provider-overrides/content-override-panel';
import { DefaultContentCard } from '@/components/workflow-editor/steps/shared/provider-overrides/default-content-card';
import { useProviderOverrideOptions } from '@/components/workflow-editor/steps/shared/provider-overrides/use-provider-override-options';
import { TabsSection } from '@/components/workflow-editor/steps/tabs-section';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { StepEditorUnavailable } from '../step-editor-unavailable';

type ChatEditorProps = { uiSchema: UiSchema };

/** Split out so the flag-off editor never subscribes to the `providerOverrides` form field. */
function ChatOverrideEditor({ defaultContent }: { defaultContent: ReactNode }) {
  const { providerOptions, providerOverrides } = useProviderOverrideOptions(ChannelTypeEnum.CHAT);

  return (
    <ContentOverridePanel
      channel={ChannelTypeEnum.CHAT}
      providerOptions={providerOptions}
      providerOverrides={providerOverrides}
      defaultContent={defaultContent}
      showEscapeHatchBadge
    />
  );
}

export const ChatEditor = (props: ChatEditorProps) => {
  const { currentEnvironment } = useEnvironment();
  const { uiSchema } = props;
  const { body } = uiSchema?.properties ?? {};
  const areProviderOverridesEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CHAT_PROVIDER_OVERRIDES_ENABLED);

  if (currentEnvironment?.type !== EnvironmentTypeEnum.DEV) {
    return <StepEditorUnavailable />;
  }

  const defaultContent = body ? getComponentByType({ component: body.component }) : null;

  if (areProviderOverridesEnabled) {
    return <ChatOverrideEditor defaultContent={defaultContent} />;
  }

  return (
    <div className="flex h-full flex-col">
      <TabsSection className="p-0 pb-3">
        <DefaultContentCard>{defaultContent}</DefaultContentCard>
      </TabsSection>
    </div>
  );
};
