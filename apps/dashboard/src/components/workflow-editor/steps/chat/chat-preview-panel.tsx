import {
  ChannelTypeEnum,
  type ChatRenderOutput,
  FeatureFlagsKeysEnum,
  type GeneratePreviewResponseDto,
} from '@novu/shared';
import { Skeleton } from '@/components/primitives/skeleton';
import { DEFAULT_CONTENT_SOURCE } from '@/components/workflow-editor/steps/shared/provider-overrides/content-source';
import { useContentSource } from '@/components/workflow-editor/steps/shared/provider-overrides/content-source-context';
import {
  useAnnotatedOverridePreview,
  usePreviewOverrideValues,
} from '@/components/workflow-editor/steps/shared/provider-overrides/override-preview';
import { PreviewSourceBar } from '@/components/workflow-editor/steps/shared/provider-overrides/preview-source-bar';
import { ResolvedPayloadPreview } from '@/components/workflow-editor/steps/shared/provider-overrides/resolved-payload-preview';
import { useProviderOverrideOptions } from '@/components/workflow-editor/steps/shared/provider-overrides/use-provider-override-options';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { ChatPreview } from './chat-preview';
import { ChatBlockEditorPreview } from './preview/chat-block-editor-preview';

type ChatPreviewPanelProps = {
  isPreviewPending: boolean;
  previewData?: GeneratePreviewResponseDto;
};

function extractChatPreview(previewData?: GeneratePreviewResponseDto): ChatRenderOutput | undefined {
  const result = previewData?.result;

  return result?.type === ChannelTypeEnum.CHAT ? (result.preview as ChatRenderOutput) : undefined;
}

/**
 * Wraps the Slack-style chat mock with the content-source bar. Provider tabs render the merged
 * override payload as JSON rather than a channel-specific renderer.
 *
 * Split out so the flag-off preview never subscribes to the `providerOverrides` form field.
 */
function ChatOverridePreview({ isPreviewPending, previewData }: ChatPreviewPanelProps) {
  const { providerOptions, overrides } = useProviderOverrideOptions(ChannelTypeEnum.CHAT);
  const { selectedSource, previewSource, setPreviewSource } = useContentSource();

  const preview = extractChatPreview(previewData);
  const body = preview?.body ?? '';
  const overrideSource = previewSource === DEFAULT_CONTENT_SOURCE ? undefined : previewSource;

  const previewOverrides = usePreviewOverrideValues(preview);
  const annotatedPreview = useAnnotatedOverridePreview({
    body,
    source: overrideSource,
    formOverrides: overrides,
    previewOverrides,
  });

  const isViewingOverride = selectedSource !== DEFAULT_CONTENT_SOURCE;

  const renderBody = () => {
    if (!overrideSource || !annotatedPreview) {
      return <ChatPreview isPreviewPending={isPreviewPending} previewData={previewData} showPlatformSelector={false} />;
    }

    if (isPreviewPending) {
      return <Skeleton className="h-24 w-full shrink-0 rounded-md" />;
    }

    return (
      <ResolvedPayloadPreview
        lines={annotatedPreview.annotatedLines}
        source={overrideSource}
        providerOptions={providerOptions}
      />
    );
  };

  return (
    <div className="-mx-3 -mt-3 flex h-full min-h-0 w-full flex-col">
      <PreviewSourceBar
        visible={!isViewingOverride}
        selectedSource={previewSource}
        providers={providerOptions}
        showEscapeHatchBadge
        onSelectSource={setPreviewSource}
      />

      <div className="flex min-h-0 flex-1 flex-col p-3">{renderBody()}</div>
    </div>
  );
}

/**
 * Chat step preview router. The rich default-preview shell, platform selector, warning banners,
 * and editor content-source sync live exclusively in `ChatBlockEditorPreview` and are only mounted
 * when `IS_CHAT_BLOCK_EDITOR_ENABLED` is on.
 */
export const ChatPreviewPanel = (props: ChatPreviewPanelProps) => {
  const isBlockEditorEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CHAT_BLOCK_EDITOR_ENABLED);
  const areProviderOverridesEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CHAT_PROVIDER_OVERRIDES_ENABLED);

  if (isBlockEditorEnabled) {
    return <ChatBlockEditorPreview {...props} />;
  }

  if (areProviderOverridesEnabled) {
    return <ChatOverridePreview {...props} />;
  }

  return <ChatPreview {...props} showPlatformSelector={false} />;
};
