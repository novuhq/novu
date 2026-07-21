import {
  buildAnnotatedPreviewLines,
  ChannelTypeEnum,
  type GeneratePreviewResponseDto,
  getToolProviderPrimaryContentKey,
  mergeToolProviderPreview,
  type ToolRenderOutput,
} from '@novu/shared';
import { useMemo } from 'react';
import { ToolFill } from '@/components/icons/tool-fill';
import { Skeleton } from '@/components/primitives/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { DEFAULT_CONTENT_SOURCE } from './tool-content-source';
import { useToolContentSource } from './tool-content-source-context';
import { ToolContentSourceSelector } from './tool-content-source-selector';
import { useToolOverrideProviderOptions } from './use-tool-override-provider-options';

type ToolPreviewResult = {
  type: string;
  preview?: ToolRenderOutput;
};

type ToolPreviewProps = {
  isPreviewPending: boolean;
  previewData?: GeneratePreviewResponseDto;
};

const PANEL_CLASS =
  'bg-neutral-alpha-50 text-foreground-950 min-h-16 overflow-auto rounded-md border border-neutral-100 p-2 font-mono text-[11px] leading-4 [scrollbar-gutter:stable]';

const EMPTY_BODY_PLACEHOLDER = 'Default content will be delivered to enabled tools';

const DEFAULT_CONTENT_CHIP_CLASS =
  'text-label-2xs text-foreground-600 bg-neutral-alpha-100 inline-flex h-4 select-none items-center rounded-sm px-1 font-medium';

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
  const previewProviderOverrides = preview?.providerOverrides ?? {};

  const { providerOptions } = useToolOverrideProviderOptions();
  const { previewSource, setPreviewSource } = useToolContentSource();
  const activeProviderId = previewSource === DEFAULT_CONTENT_SOURCE ? undefined : previewSource;

  const { annotatedLines, defaultContentKey } = useMemo(() => {
    if (!activeProviderId) {
      return { annotatedLines: undefined, defaultContentKey: undefined };
    }

    const result = mergeToolProviderPreview({
      body,
      providerId: activeProviderId,
      override: previewProviderOverrides[activeProviderId],
    });

    return {
      annotatedLines: buildAnnotatedPreviewLines(result.merged, result.defaultContentKey),
      defaultContentKey: result.defaultContentKey,
    };
  }, [activeProviderId, body, previewProviderOverrides]);

  const hasOverride = !!activeProviderId && activeProviderId in previewProviderOverrides;

  const getHintText = () => {
    if (!activeProviderId) {
      return "This message is delivered to every enabled tool provider, mapped to each provider's primary content field.";
    }

    if (hasOverride) {
      if (!defaultContentKey) {
        return 'Override merged over the default content.';
      }

      if (!body) {
        return `Override merged over the default content. "${defaultContentKey}" is taken from your default message (currently empty).`;
      }

      return `Override merged over the default content. "${defaultContentKey}" is taken from your default message.`;
    }

    const primaryKey = getToolProviderPrimaryContentKey(activeProviderId);

    return `No override for this provider. Default message maps to "${primaryKey}".`;
  };

  const renderPanel = () => {
    if (annotatedLines) {
      return (
        <pre className={PANEL_CLASS}>
          {annotatedLines.map((line, index) => (
            <div key={`${index}-${line.json}`}>
              {line.json}
              {line.isDefaultContentKey ? (
                <>
                  {' '}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={DEFAULT_CONTENT_CHIP_CLASS}>DEFAULT CONTENT</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {`Filled from your Default content because the override doesn't set "${defaultContentKey}".`}
                    </TooltipContent>
                  </Tooltip>
                </>
              ) : null}
            </div>
          ))}
        </pre>
      );
    }

    return <div className={`${PANEL_CLASS} whitespace-pre-wrap`}>{body || EMPTY_BODY_PLACEHOLDER}</div>;
  };

  return (
    <div className="-mx-3 -mt-3 flex h-full min-h-0 w-full flex-col">
      <div className="border-stroke-soft bg-bg-weak flex h-7 shrink-0 items-center border-b">
        <ToolContentSourceSelector
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
                <>
                  <span className="text-foreground-600 text-label-2xs font-medium uppercase tracking-wide">
                    {activeProviderId ? 'Merged override fields' : 'Message'}
                  </span>
                  {hasOverride && (
                    <span className="text-label-2xs text-foreground-600 bg-neutral-alpha-100 flex h-4 items-center rounded-sm px-1 font-medium">
                      OVERRIDDEN
                    </span>
                  )}
                </>
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
