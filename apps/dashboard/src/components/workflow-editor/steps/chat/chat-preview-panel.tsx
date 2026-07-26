import {
  ChannelTypeEnum,
  type ChatRenderOutput,
  FeatureFlagsKeysEnum,
  type GeneratePreviewResponseDto,
} from '@novu/shared';
import { Skeleton } from '@/components/primitives/skeleton';
import { AnnotatedOverrideJson } from '@/components/workflow-editor/steps/shared/provider-overrides/annotated-override-json';
import { DEFAULT_CONTENT_SOURCE } from '@/components/workflow-editor/steps/shared/provider-overrides/content-source';
import { useContentSource } from '@/components/workflow-editor/steps/shared/provider-overrides/content-source-context';
import { ContentSourceSelector } from '@/components/workflow-editor/steps/shared/provider-overrides/content-source-selector';
import {
  getMergedOverrideHint,
  useAnnotatedOverridePreview,
} from '@/components/workflow-editor/steps/shared/provider-overrides/override-preview';
import { useProviderOverrideOptions } from '@/components/workflow-editor/steps/shared/provider-overrides/use-provider-override-options';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { ChatPreview } from './chat-preview';

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
  const { providerOptions } = useProviderOverrideOptions(ChannelTypeEnum.CHAT);
  const { previewSource, setPreviewSource } = useContentSource();

  const preview = extractChatPreview(previewData);
  const body = preview?.body ?? '';
  const previewProviderOverrides = preview?.providerOverrides ?? {};
  const activeProviderId = previewSource === DEFAULT_CONTENT_SOURCE ? undefined : previewSource;

  const annotatedPreview = useAnnotatedOverridePreview({
    body,
    providerId: activeProviderId,
    override: activeProviderId ? previewProviderOverrides[activeProviderId] : undefined,
  });

  const renderBody = () => {
    if (!activeProviderId || !annotatedPreview) {
      return <ChatPreview isPreviewPending={isPreviewPending} previewData={previewData} />;
    }

    if (isPreviewPending) {
      return <Skeleton className="h-24 w-full shrink-0 rounded-md" />;
    }

    const displayName =
      providerOptions.find((option) => option.providerId === activeProviderId)?.displayName ?? activeProviderId;

    return (
      <div className="flex min-h-0 flex-col gap-1.5">
        <span className="text-foreground-600 text-label-2xs font-medium uppercase tracking-wide">
          Merged override fields
        </span>
        <AnnotatedOverrideJson {...annotatedPreview} />
        <div className="text-foreground-400 text-label-2xs min-h-4 shrink-0">
          {getMergedOverrideHint({
            hasOverride: activeProviderId in previewProviderOverrides,
            defaultContentKey: annotatedPreview.defaultContentKey,
            body,
            providerId: activeProviderId,
            displayName,
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="-mx-3 -mt-3 flex h-full min-h-0 w-full flex-col">
      <div className="border-stroke-soft bg-bg-weak flex h-7 shrink-0 items-center border-b">
        <ContentSourceSelector
          selectedSource={previewSource}
          providers={providerOptions}
          showEscapeHatchBadge
          onSelectSource={setPreviewSource}
        />
        <div className="h-full flex-1" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-3">{renderBody()}</div>
    </div>
  );
}

export const ChatPreviewPanel = (props: ChatPreviewPanelProps) => {
  const areProviderOverridesEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CHAT_PROVIDER_OVERRIDES_ENABLED);

  if (!areProviderOverridesEnabled) {
    return <ChatPreview {...props} />;
  }

  return <ChatOverridePreview {...props} />;
};
