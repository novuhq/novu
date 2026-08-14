import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useFormContext, useWatch } from 'react-hook-form';
import { TabsSection } from '@/components/workflow-editor/steps/tabs-section';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { BaseBody } from '../base/base-body';
import { ChatBodyMaily } from './chat-body-maily';
import { deriveChatEditorType } from './derive-chat-editor-type';

const LegacyChatBody = () => (
  <TabsSection className="p-0 pb-3">
    <div className="rounded-12 bg-bg-weak flex flex-col gap-2 border border-neutral-100 p-2">
      <BaseBody />
    </div>
  </TabsSection>
);

const RichChatBody = () => {
  const { control } = useFormContext();
  const body = useWatch({ name: 'body', control });
  const editorType = useWatch({ name: 'editorType', control });
  const resolvedEditorType = deriveChatEditorType(body, editorType, true);

  if (resolvedEditorType === 'text') {
    return <BaseBody />;
  }

  return <ChatBodyMaily />;
};

/**
 * Chat step body editor. Behind `IS_CHAT_BLOCK_EDITOR_ENABLED` the step can
 * switch between the Maily block editor and a plain-text editor.
 * Legacy raw/Liquid bodies open in Text; new empty steps default to Block.
 * The Block/Text toggle is rendered by chat-editor inside the TabsSection
 * (top-right). Without the flag the legacy plain-text editor is used unchanged.
 */
export const ChatBody = () => {
  const isBlockEditorEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CHAT_BLOCK_EDITOR_ENABLED);

  if (!isBlockEditorEnabled) {
    return <LegacyChatBody />;
  }

  return <RichChatBody />;
};
