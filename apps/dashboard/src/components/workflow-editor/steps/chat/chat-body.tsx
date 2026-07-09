import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useFormContext, useWatch } from 'react-hook-form';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { isMailyJson } from '../../../maily/maily-utils';
import { BaseBody } from '../base/base-body';
import { ChatBodyBlocks } from './chat-body-blocks';

export const ChatBody = () => {
  const { control } = useFormContext();
  const editorType = useWatch({ name: 'editorType', control });
  const body = useWatch({ name: 'body', control });
  const isBlockEditorEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CHAT_BLOCK_EDITOR_ENABLED);

  /*
   * A doc-JSON body always renders in the block editor (even with the flag off,
   * showing raw JSON would be worse). Otherwise: existing plain-string steps stay
   * in text mode until explicitly switched; new empty steps default to blocks when
   * the flag is on.
   */
  const isBlockEditor =
    isMailyJson(body) || (isBlockEditorEnabled && editorType !== 'text' && (editorType === 'block' || !body));

  if (isBlockEditor) {
    return <ChatBodyBlocks />;
  }

  return <BaseBody />;
};
