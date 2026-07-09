import { EnvironmentTypeEnum, UiComponentEnum, type UiSchema } from '@novu/shared';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { TabsSection } from '@/components/workflow-editor/steps/tabs-section';
import { useEnvironment } from '@/context/environment/hooks';
import { StepEditorUnavailable } from '../step-editor-unavailable';

type ChatEditorProps = { uiSchema: UiSchema };

export const ChatEditor = (props: ChatEditorProps) => {
  const { currentEnvironment } = useEnvironment();
  const { uiSchema } = props;
  const { body, editorType } = uiSchema?.properties ?? {};

  if (currentEnvironment?.type !== EnvironmentTypeEnum.DEV) {
    return <StepEditorUnavailable />;
  }

  return (
    <div className="flex h-full flex-col">
      <TabsSection className="p-0 pb-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-end">
            {getComponentByType({ component: editorType?.component ?? UiComponentEnum.CHAT_EDITOR_SELECT })}
          </div>
          <div className="rounded-12 flex flex-col gap-2 border border-neutral-100 p-2 bg-bg-weak">
            {getComponentByType({ component: body.component })}
          </div>
        </div>
      </TabsSection>
    </div>
  );
};
