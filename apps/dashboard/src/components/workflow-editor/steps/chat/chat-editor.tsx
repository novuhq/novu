import { EnvironmentTypeEnum, UiComponentEnum, type UiSchema } from '@novu/shared';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { TabsSection } from '@/components/workflow-editor/steps/tabs-section';
import { useEnvironment } from '@/context/environment/hooks';
import { StepEditorUnavailable } from '../step-editor-unavailable';

type ChatEditorProps = { uiSchema: UiSchema };

/**
 * The chat step edits via a single unified editor. The `CHAT_RICH_BODY`
 * component owns both the rich `card` tree and the flattened `body` field
 * (auto-synced), so we only render the editor once even though the UI
 * schema exposes two properties.
 */
export const ChatEditor = (props: ChatEditorProps) => {
  const { currentEnvironment } = useEnvironment();
  const { uiSchema } = props;
  const { body, card } = uiSchema?.properties ?? {};
  const editorComponent = card?.component ?? body?.component ?? UiComponentEnum.CHAT_BODY;

  if (currentEnvironment?.type !== EnvironmentTypeEnum.DEV) {
    return <StepEditorUnavailable />;
  }

  return (
    <div className="flex h-full flex-col">
      <TabsSection className="p-0 pb-3">
        <div className="rounded-12 flex flex-col gap-2 border border-neutral-100 p-2 bg-bg-weak">
          {getComponentByType({ component: editorComponent })}
        </div>
      </TabsSection>
    </div>
  );
};
