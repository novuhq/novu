import {
  ChannelTypeEnum,
  type ChatRenderOutput,
  FeatureFlagsKeysEnum,
  type GeneratePreviewResponseDto,
} from '@novu/shared';
import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { ChatPreview } from '@/components/workflow-editor/steps/chat/chat-preview';
import { ChatShellContent } from '@/components/workflow-editor/steps/chat/preview/chat-shell-content';
import { DEFAULT_PREVIEW_PROVIDER_ID } from '@/components/workflow-editor/steps/chat/preview/use-configured-chat-providers';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { usePreviewStep } from '@/hooks/use-preview-step';

function extractChatPreview(previewData?: GeneratePreviewResponseDto): ChatRenderOutput | undefined {
  const result = previewData?.result;

  return result?.type === ChannelTypeEnum.CHAT ? (result.preview as ChatRenderOutput) : undefined;
}

export const ConfigureChatStepPreview = () => {
  const isBlockEditorEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CHAT_BLOCK_EDITOR_ENABLED);
  const {
    previewStep,
    data: previewData,
    isPending: isPreviewPending,
  } = usePreviewStep({
    onError: (error) => Sentry.captureException(error),
  });
  const { step, isPending } = useWorkflow();

  const { workflowSlug, stepSlug } = useParams<{
    workflowSlug: string;
    stepSlug: string;
  }>();

  useEffect(() => {
    if (!workflowSlug || !stepSlug || !step || isPending) return;

    previewStep({
      workflowSlug,
      stepSlug,
      previewData: { controlValues: step.controls.values, previewPayload: {} },
    });
  }, [workflowSlug, stepSlug, previewStep, step, isPending]);

  if (!isBlockEditorEnabled) {
    return <ChatPreview isPreviewPending={isPreviewPending} previewData={previewData} variant="mini" />;
  }

  const preview = extractChatPreview(previewData);

  return (
    <ChatShellContent
      providerId={DEFAULT_PREVIEW_PROVIDER_ID}
      variant="mini"
      card={preview?.card}
      body={preview?.body ?? ''}
      isPreviewPending={isPreviewPending}
    />
  );
};
