import { ChannelTypeEnum, EnvironmentTypeEnum, FeatureFlagsKeysEnum, type UiSchema } from '@novu/shared';
import { type ReactNode } from 'react';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { ContentOverridePanel } from '@/components/workflow-editor/steps/shared/provider-overrides/content-override-panel';
import { useProviderOverrideOptions } from '@/components/workflow-editor/steps/shared/provider-overrides/use-provider-override-options';
import { TabsSection } from '@/components/workflow-editor/steps/tabs-section';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { StepEditorUnavailable } from '../step-editor-unavailable';

type PushEditorProps = { uiSchema: UiSchema };

/** Split out so the flag-off editor never subscribes to the `providerOverrides` form field. */
function PushOverrideEditor({ defaultContent }: { defaultContent: ReactNode }) {
  const { providerOptions, providerOverrides } = useProviderOverrideOptions(ChannelTypeEnum.PUSH);

  return (
    <ContentOverridePanel
      channel={ChannelTypeEnum.PUSH}
      providerOptions={providerOptions}
      providerOverrides={providerOverrides}
      defaultContent={defaultContent}
      showEscapeHatchBadge={false}
    />
  );
}

export const PushEditor = (props: PushEditorProps) => {
  const { currentEnvironment } = useEnvironment();
  const { uiSchema } = props;
  const { body, subject } = uiSchema?.properties ?? {};
  const areProviderOverridesEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_PUSH_PROVIDER_OVERRIDES_ENABLED);

  if (currentEnvironment?.type !== EnvironmentTypeEnum.DEV) {
    return <StepEditorUnavailable />;
  }

  const defaultContent =
    subject || body ? (
      <>
        {subject ? getComponentByType({ component: subject.component }) : null}
        {body ? getComponentByType({ component: body.component }) : null}
      </>
    ) : null;

  if (areProviderOverridesEnabled) {
    return <PushOverrideEditor defaultContent={defaultContent} />;
  }

  return (
    <div className="flex h-full flex-col">
      <TabsSection className="p-0 pb-3">
        <div className="rounded-12 flex flex-col gap-2 border border-neutral-100 p-2 bg-bg-weak">
          {subject ? getComponentByType({ component: subject.component }) : null}
          {body ? getComponentByType({ component: body.component }) : null}
        </div>
      </TabsSection>
    </div>
  );
};
