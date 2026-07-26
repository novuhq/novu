import {
  ChannelTypeEnum,
  type GeneratePreviewResponseDto,
  ToolProviderIdEnum,
  type ToolRenderOutput,
} from '@novu/shared';
import { ToolFill } from '@/components/icons/tool-fill';
import { Skeleton } from '@/components/primitives/skeleton';
import { AnnotatedOverrideJson } from '@/components/workflow-editor/steps/shared/provider-overrides/annotated-override-json';
import { DEFAULT_CONTENT_SOURCE } from '@/components/workflow-editor/steps/shared/provider-overrides/content-source';
import { useContentSource } from '@/components/workflow-editor/steps/shared/provider-overrides/content-source-context';
import { ContentSourceSelector } from '@/components/workflow-editor/steps/shared/provider-overrides/content-source-selector';
import {
  getMergedOverrideHint,
  PREVIEW_PANEL_CLASS,
  useAnnotatedOverridePreview,
} from '@/components/workflow-editor/steps/shared/provider-overrides/override-preview';
import { useToolOverrideProviderOptions } from './use-tool-override-provider-options';

type ToolPreviewResult = {
  type: string;
  preview?: ToolRenderOutput;
};

type ToolPreviewProps = {
  isPreviewPending: boolean;
  previewData?: GeneratePreviewResponseDto;
};

const EMPTY_BODY_PLACEHOLDER = 'Default content will be delivered to enabled tools';

function extractToolPreview(previewData?: GeneratePreviewResponseDto): ToolRenderOutput | undefined {
  const previewResult = previewData?.result as ToolPreviewResult | undefined;

  return previewResult?.type === ChannelTypeEnum.TOOL ? previewResult.preview : undefined;
}

export const ToolPreviewMini = ({ isPreviewPending, previewData }: ToolPreviewProps) => {
  const body = extractToolPreview(previewData)?.body ?? '';

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-dashed border-[#E1E4EA] p-3">
      <div className="flex flex-col gap-3">
        <div className="flex w-full items-start gap-2">
          <div className="flex size-6 items-center justify-center rounded-[5px] bg-warning/10 text-warning">
            <ToolFill className="size-3.5" />
          </div>
          <div className="flex w-full flex-col gap-1">
            <div className="flex items-center gap-1">
              <span className="text-foreground-950 text-xs font-bold">Tool</span>
              <span className="text-label-2xs text-foreground-600 bg-neutral-alpha-100 flex h-4 items-center rounded-sm px-1 opacity-70">
                TOOL
              </span>
            </div>
            {isPreviewPending ? (
              <Skeleton className="h-4 w-1/2" />
            ) : (
              <span
                className="text-foreground-950 line-clamp-3 min-h-4 whitespace-pre-wrap text-xs font-normal"
                title={body}
              >
                {body || EMPTY_BODY_PLACEHOLDER}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="to-background absolute inset-x-0 bottom-0 z-0 h-16 rounded-b-xl bg-linear-to-b from-transparent to-80%" />
    </div>
  );
};

export const ToolPreview = ({ isPreviewPending, previewData }: ToolPreviewProps) => {
  const preview = extractToolPreview(previewData);
  const body = preview?.body ?? '';

  const { providerOptions, providerOverrides } = useToolOverrideProviderOptions();
  const { previewSource, setPreviewSource } = useContentSource();
  const activeProviderId = previewSource === DEFAULT_CONTENT_SOURCE ? undefined : previewSource;
  const isWebhookPreview = activeProviderId === ToolProviderIdEnum.Webhook;

  const annotatedPreview = useAnnotatedOverridePreview({
    body,
    providerId: isWebhookPreview ? undefined : activeProviderId,
    formOverrides: providerOverrides,
    previewOverrides: preview?.providerOverrides,
  });
  const webhookPreviewJson = isWebhookPreview
    ? JSON.stringify(preview?.providerOverrides?.[ToolProviderIdEnum.Webhook] ?? {}, null, 2)
    : undefined;

  const getHintText = () => {
    if (!activeProviderId) {
      return "This message is delivered to every enabled tool provider, mapped to each provider's primary content field.";
    }

    if (isWebhookPreview) {
      return 'Each webhook integration merges its own body template beneath this payload.';
    }

    // Non-webhook providerId always yields an annotated preview object from the hook.
    return getMergedOverrideHint({
      hasOverride: annotatedPreview?.hasOverride ?? false,
      defaultContentKey: annotatedPreview?.defaultContentKey,
      body,
      providerId: activeProviderId,
      displayName: providerOptions.find((option) => option.providerId === activeProviderId)?.displayName ?? '',
    });
  };

  const renderPanel = () => {
    if (webhookPreviewJson !== undefined) {
      return <pre className={PREVIEW_PANEL_CLASS}>{webhookPreviewJson}</pre>;
    }

    if (annotatedPreview) {
      return <AnnotatedOverrideJson {...annotatedPreview} />;
    }

    return <div className={`${PREVIEW_PANEL_CLASS} whitespace-pre-wrap`}>{body || EMPTY_BODY_PLACEHOLDER}</div>;
  };

  let previewLabel = 'Message';
  if (activeProviderId) {
    previewLabel = 'Merged override fields';
  }
  if (isWebhookPreview) {
    previewLabel = 'Rendered override JSON';
  }

  return (
    <div className="-mx-3 -mt-3 flex h-full min-h-0 w-full flex-col">
      <div className="border-stroke-soft bg-bg-weak flex h-7 shrink-0 items-center border-b">
        <ContentSourceSelector
          selectedSource={previewSource}
          providers={providerOptions}
          onSelectSource={setPreviewSource}
        />
        <div className="h-full flex-1" />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col gap-3 p-3">
        <div className="flex h-full min-h-0 w-full flex-col gap-3 rounded-xl border border-dashed border-[#E1E4EA] p-3">
          <div className="flex h-7 shrink-0 items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-[5px] bg-warning/10 text-warning">
              <ToolFill className="size-3.5" />
            </div>
            <span className="text-foreground-950 text-xs font-bold">Tool preview</span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-1.5">
            <div className="flex h-4 shrink-0 items-center gap-1.5">
              {isPreviewPending ? (
                <Skeleton className="h-3 w-40" />
              ) : (
                <span className="text-foreground-600 text-label-2xs font-medium uppercase tracking-wide">
                  {previewLabel}
                </span>
              )}
            </div>

            {isPreviewPending ? <Skeleton className="h-24 w-full shrink-0 rounded-md" /> : renderPanel()}

            <div className="text-foreground-400 text-label-2xs min-h-4 shrink-0">
              {isPreviewPending ? <Skeleton className="h-3 w-full max-w-sm" /> : getHintText()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
