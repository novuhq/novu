import { FeatureFlagsKeysEnum } from '@novu/shared';
import { TabsSection } from '@/components/workflow-editor/steps/tabs-section';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { BaseBody } from '../base/base-body';
import { ChatBodyMaily } from './chat-body-maily';

const LegacyChatBody = () => (
  <TabsSection className="p-0 pb-3">
    <div className="rounded-12 bg-bg-weak flex flex-col gap-2 border border-neutral-100 p-2">
      <BaseBody />
    </div>
  </TabsSection>
);

/**
 * Chat step body editor. Behind `IS_CHAT_BLOCK_EDITOR_ENABLED` the step is
 * always authored with the restricted Maily block editor, which handles
 * back-compat internally (Maily JSON loads as-is; a legacy plain string opens
 * as text blocks). Without the flag the legacy plain-text editor is used.
 */
export const ChatBody = () => {
  const isBlockEditorEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CHAT_BLOCK_EDITOR_ENABLED);

  if (!isBlockEditorEnabled) {
    return <LegacyChatBody />;
  }

  return <ChatBodyMaily />;
};
