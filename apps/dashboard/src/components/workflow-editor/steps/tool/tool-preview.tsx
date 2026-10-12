import {
  ChannelTypeEnum,
  type GeneratePreviewResponseDto,
  getProviderPrimaryContentKey,
  ToolProviderIdEnum,
  type ToolRenderOutput,
} from '@novu/shared';
import { ToolFill } from '@/components/icons/tool-fill';
import { Skeleton } from '@/components/primitives/skeleton';
import {
  DEFAULT_CONTENT_SOURCE,
  type OverrideContentSource,
  type ProviderOverrideOption,
} from '@/components/workflow-editor/steps/shared/provider-overrides/content-source';
import { useContentSource } from '@/components/workflow-editor/steps/shared/provider-overrides/content-source-context';
import {
  PREVIEW_PANEL_CLASS,
  useAnnotatedOverridePreview,
  usePreviewOverrideValues,
} from '@/components/workflow-editor/steps/shared/provider-overrides/override-preview';
import { PreviewSourceBar } from '@/components/workflow-editor/steps/shared/provider-overrides/preview-source-bar';
import { ResolvedPayloadPreview } from '@/components/workflow-editor/steps/shared/provider-overrides/resolved-payload-preview';
import { useProviderOverrideOptions } from '@/components/workflow-editor/steps/shared/provider-overrides/use-provider-override-options';

type ToolPreviewResult = {
  type: string;
  preview?: ToolRenderOutput;
};

type ToolPreviewProps = {
  isPreviewPending: boolean;
  previewData?: GeneratePreviewResponseDto;
};

const EMPTY_BODY_PLACEHOLDER = 'Default content will be delivered to enabled tools';

/** The provider-wide webhook payload is shown raw; an integration's is shown merged over it. */
type ToolPreviewMode =
  | { kind: 'default' }
  | { kind: 'override' | 'webhook-provider' | 'webhook-integration'; source: OverrideContentSource };

function getToolPreviewMode(source: OverrideContentSource | undefined): ToolPreviewMode {
  if (!source) {
    return { kind: 'default' };
  }

  if (source.providerId !== ToolProviderIdEnum.Webhook) {
    return { kind: 'override', source };
  }

  return { kind: source.integrationIdentifier === undefined ? 'webhook-provider' : 'webhook-integration', source };
}

function formatConnectedPrimaryContentHints(providerOptions: ProviderOverrideOption[]): string {
  return providerOptions
    .filter((option) => option.isConnected)
    .flatMap((option) => {
      const primaryKey = getProviderPrimaryContentKey(option.providerId);

      return primaryKey ? [`${option.displayName}: ${primaryKey}`] : [];
    })
    .join(' · ');
}

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
                className={`line-clamp-3 min-h-4 whitespace-pre-wrap text-xs font-normal ${
                  body ? 'text-foreground-950' : 'text-foreground-400 italic'
                }`}
                title={body || EMPTY_BODY_PLACEHOLDER}
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

  const { providerOptions, overrides } = useProviderOverrideOptions(ChannelTypeEnum.TOOL);
  const { selectedSource, previewSource, setPreviewSource } = useContentSource();
  const overrideSource = previewSource === DEFAULT_CONTENT_SOURCE ? undefined : previewSource;
  const previewMode = getToolPreviewMode(overrideSource);

  const previewOverrides = usePreviewOverrideValues(preview);
  const annotatedPreview = useAnnotatedOverridePreview({
    body,
    source: previewMode.kind === 'webhook-provider' ? undefined : overrideSource,
    formOverrides: overrides,
    previewOverrides,
  });

  const getDefaultHintText = () => {
    const defaultContentMapping = formatConnectedPrimaryContentHints(providerOptions);

    if (!defaultContentMapping) {
      return 'Delivered to every enabled tool provider.';
    }

    return `Delivered to every enabled tool provider — ${defaultContentMapping}.`;
  };

  const renderDefaultPanel = () => {
    if (!body) {
      return (
        <div className="text-foreground-400 flex min-h-16 items-center justify-center rounded-md border border-dashed border-neutral-100 p-2 text-xs italic">
          {EMPTY_BODY_PLACEHOLDER}
        </div>
      );
    }

    return <div className={`${PREVIEW_PANEL_CLASS} whitespace-pre-wrap`}>{body}</div>;
  };

  const renderPreview = () => {
    if (isPreviewPending) {
      return <Skeleton className="h-24 w-full shrink-0 rounded-md" />;
    }

    switch (previewMode.kind) {
      case 'default':
        return (
          <>
            <span className="text-foreground-600 text-label-2xs font-medium uppercase tracking-wide">
              Default content
            </span>
            {renderDefaultPanel()}
            <div className="text-foreground-400 text-label-2xs min-h-4 shrink-0">{getDefaultHintText()}</div>
          </>
        );
      case 'webhook-provider': {
        const webhookPreviewLines = JSON.stringify(
          preview?.providerOverrides?.[ToolProviderIdEnum.Webhook] ?? {},
          null,
          2
        )
          .split('\n')
          .map((json) => ({ json }));

        return (
          <ResolvedPayloadPreview
            lines={webhookPreviewLines}
            source={previewMode.source}
            providerOptions={providerOptions}
            hint="Each webhook integration merges its own body template beneath this payload."
          />
        );
      }
      case 'webhook-integration':
      case 'override':
        return annotatedPreview ? (
          <ResolvedPayloadPreview
            lines={annotatedPreview.annotatedLines}
            source={previewMode.source}
            providerOptions={providerOptions}
            hint={
              previewMode.kind === 'webhook-integration'
                ? 'This integration merges its own body template beneath this payload.'
                : undefined
            }
          />
        ) : null;
      default: {
        const unhandled: never = previewMode;

        return unhandled;
      }
    }
  };

  const isViewingOverride = selectedSource !== DEFAULT_CONTENT_SOURCE;

  return (
    <div className="-mx-3 -mt-3 flex h-full min-h-0 w-full flex-col">
      <PreviewSourceBar
        visible={!isViewingOverride}
        selectedSource={previewSource}
        providers={providerOptions}
        onSelectSource={setPreviewSource}
      />

      <div className="relative flex min-h-0 flex-1 flex-col gap-3 p-3">
        {previewMode.kind === 'default' ? (
          <div className="flex h-full min-h-0 w-full flex-col gap-3 rounded-xl border border-dashed border-[#E1E4EA] p-3">
            <div className="flex h-7 shrink-0 items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-[5px] bg-warning/10 text-warning">
                <ToolFill className="size-3.5" />
              </div>
              <span className="text-foreground-950 text-xs font-bold">Tool preview</span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-1.5">{renderPreview()}</div>
          </div>
        ) : (
          renderPreview()
        )}
      </div>
    </div>
  );
};
