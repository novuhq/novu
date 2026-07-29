import {
  ChannelTypeEnum,
  FeatureFlagsKeysEnum,
  type GeneratePreviewResponseDto,
  type PushRenderOutput,
} from '@novu/shared';
import { type ReactNode } from 'react';
import { InlineToast } from '@/components/primitives/inline-toast';
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
import { PushPreview } from './push-preview';

type PushPreviewPanelProps = {
  isPreviewPending: boolean;
  previewData?: GeneratePreviewResponseDto;
};

/** Push preview DTO may omit `providerOverrides` until the shared type catches up — read safely. */
type PushRenderOutputWithOverrides = PushRenderOutput & {
  providerOverrides?: Partial<Record<string, Record<string, unknown>>>;
};

const MOBILE_PREVIEW_DESCRIPTION =
  'This preview shows how your message will appear on mobile. Actual rendering may vary by device.';

function MobilePushPreview({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center">
      {children}
      <InlineToast description={MOBILE_PREVIEW_DESCRIPTION} className="w-full px-3" />
    </div>
  );
}

function extractPushPreview(previewData?: GeneratePreviewResponseDto): PushRenderOutputWithOverrides | undefined {
  const result = previewData?.result;

  return result?.type === ChannelTypeEnum.PUSH ? (result.preview as PushRenderOutputWithOverrides) : undefined;
}

/**
 * Wraps the phone push mock with the content-source bar. Provider tabs render the merged
 * override payload as JSON rather than a channel-specific renderer.
 *
 * Split out so the flag-off preview never subscribes to the `providerOverrides` form field.
 */
function PushOverridePreview({ isPreviewPending, previewData }: PushPreviewPanelProps) {
  const { providerOptions, providerOverrides } = useProviderOverrideOptions(ChannelTypeEnum.PUSH);
  const { previewSource, setPreviewSource } = useContentSource();

  const preview = extractPushPreview(previewData);
  const body = preview?.body ?? '';
  const activeProviderId = previewSource === DEFAULT_CONTENT_SOURCE ? undefined : previewSource;

  const annotatedPreview = useAnnotatedOverridePreview({
    body,
    providerId: activeProviderId,
    formOverrides: providerOverrides,
    previewOverrides: preview?.providerOverrides,
  });

  const renderBody = () => {
    if (!activeProviderId || !annotatedPreview) {
      return (
        <MobilePushPreview>
          <PushPreview isPreviewPending={isPreviewPending} previewData={previewData} />
        </MobilePushPreview>
      );
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
            hasOverride: annotatedPreview.hasOverride,
            defaultContentKey: annotatedPreview.defaultContentKey,
            body,
            providerId: activeProviderId,
            displayName,
            variant: 'push',
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
          showEscapeHatchBadge={false}
          onSelectSource={setPreviewSource}
        />
        <div className="h-full flex-1" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-3">{renderBody()}</div>
    </div>
  );
}

export const PushPreviewPanel = (props: PushPreviewPanelProps) => {
  const areProviderOverridesEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_PUSH_PROVIDER_OVERRIDES_ENABLED);

  if (!areProviderOverridesEnabled) {
    return (
      <MobilePushPreview>
        <PushPreview {...props} />
      </MobilePushPreview>
    );
  }

  return <PushOverridePreview {...props} />;
};
