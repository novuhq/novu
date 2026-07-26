import { EnvironmentTypeEnum, FeatureFlagsKeysEnum, type UiSchema } from '@novu/shared';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { ContentOverridePanel } from '@/components/workflow-editor/steps/shared/provider-overrides/content-override-panel';
import { useProviderOverrideOptions } from '@/components/workflow-editor/steps/shared/provider-overrides/use-provider-override-options';
import { TabsSection } from '@/components/workflow-editor/steps/tabs-section';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { StepEditorUnavailable } from '../step-editor-unavailable';
import { CHAT_OVERRIDE_CHANNEL } from './chat-content-source';

type ChatEditorProps = { uiSchema: UiSchema };

export const ChatEditor = (props: ChatEditorProps) => {
  const { currentEnvironment } = useEnvironment();
  const { uiSchema } = props;
  const { body } = uiSchema?.properties ?? {};
  const areProviderOverridesEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CHAT_PROVIDER_OVERRIDES_ENABLED);
  const { providerOptions, providerOverrides } = useProviderOverrideOptions(CHAT_OVERRIDE_CHANNEL);

  if (currentEnvironment?.type !== EnvironmentTypeEnum.DEV) {
    return <StepEditorUnavailable />;
  }

  const defaultContent = body ? getComponentByType({ component: body.component }) : null;

  if (!areProviderOverridesEnabled) {
    return (
      <div className="flex h-full flex-col">
        <TabsSection className="p-0 pb-3">
          <div className="rounded-12 flex flex-col gap-2 border border-neutral-100 p-2 bg-bg-weak">
            {defaultContent}
          </div>
        </TabsSection>
      </div>
    );
  }

  return (
    <ContentOverridePanel
      channel={CHAT_OVERRIDE_CHANNEL}
      providerOptions={providerOptions}
      providerOverrides={providerOverrides}
      defaultContent={defaultContent}
      showEscapeHatchBadge
    />
  );
};
