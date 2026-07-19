import {
  ChannelTypeEnum,
  type GeneratePreviewResponseDto,
  TOOL_CONTENT_OVERRIDE_PROVIDER_IDS,
  type ToolContentOverrideProviderId,
  type ToolRenderOutput,
} from '@novu/shared';
import { useMemo, useState } from 'react';
import { ToolFill } from '@/components/icons/tool-fill';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { Skeleton } from '@/components/primitives/skeleton';
import { getToolOverrideProviderDisplayName, mergeToolProviderPreview } from './tool-content-source';

type ToolPreviewResult = {
  type: string;
  preview?: ToolRenderOutput;
};

const JSON_PANEL_CLASS =
  'bg-neutral-alpha-50 text-foreground-950 min-h-16 overflow-auto rounded-md border border-neutral-100 p-2 font-mono text-[11px] leading-4 [scrollbar-gutter:stable]';

export const ToolPreview = ({
  isPreviewPending,
  previewData,
  variant = 'default',
}: {
  isPreviewPending: boolean;
  previewData?: GeneratePreviewResponseDto;
  variant?: 'mini' | 'default';
}) => {
  const previewResult = previewData?.result as ToolPreviewResult | undefined;
  const preview = previewResult?.type === ChannelTypeEnum.TOOL ? previewResult.preview : undefined;
  const body = preview?.body ?? '';
  const providerOverrides = preview?.providerOverrides ?? {};
  const availableProviders = TOOL_CONTENT_OVERRIDE_PROVIDER_IDS;

  const [selectedProviderId, setSelectedProviderId] = useState<ToolContentOverrideProviderId>(availableProviders[0]);

  const activeProviderId = availableProviders.includes(selectedProviderId) ? selectedProviderId : availableProviders[0];

  const mergedPreview = useMemo(() => {
    if (!activeProviderId) {
      return { body };
    }

    return mergeToolProviderPreview({
      body,
      providerId: activeProviderId,
      override: providerOverrides[activeProviderId],
    });
  }, [activeProviderId, body, providerOverrides]);

  const hasOverride = !!activeProviderId && activeProviderId in providerOverrides;

  if (variant === 'mini') {
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
                  {body || 'Default content will be delivered to enabled tools'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="to-background absolute inset-x-0 bottom-0 z-0 h-16 rounded-b-xl bg-linear-to-b from-transparent to-80%" />
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full min-h-0 flex-col gap-3 rounded-xl border border-dashed border-[#E1E4EA] p-3">
      <div className="flex h-7 shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-[5px] bg-warning/10 text-warning">
            <ToolFill className="size-3.5" />
          </div>
          <span className="text-foreground-950 text-xs font-bold">Tool preview</span>
        </div>
        {activeProviderId && (
          <Select
            value={activeProviderId}
            onValueChange={(value) => setSelectedProviderId(value as ToolContentOverrideProviderId)}
          >
            <SelectTrigger className="h-7 w-[160px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableProviders.map((providerId) => (
                <SelectItem key={providerId} value={providerId}>
                  <div className="flex items-center gap-1.5">
                    <ProviderIcon
                      providerId={providerId}
                      providerDisplayName={getToolOverrideProviderDisplayName(providerId)}
                      className="size-3.5"
                    />
                    {getToolOverrideProviderDisplayName(providerId)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        <div className="flex h-4 shrink-0 items-center gap-1.5">
          {isPreviewPending ? (
            <Skeleton className="h-3 w-40" />
          ) : (
            <>
              <span className="text-foreground-600 text-label-2xs font-medium uppercase tracking-wide">
                Request body
              </span>
              {hasOverride && (
                <span className="text-label-2xs text-foreground-600 bg-neutral-alpha-100 flex h-4 items-center rounded-sm px-1 font-medium">
                  OVERRIDDEN
                </span>
              )}
            </>
          )}
        </div>

        {isPreviewPending ? (
          <Skeleton className="h-24 w-full shrink-0 rounded-md" />
        ) : (
          <pre className={JSON_PANEL_CLASS}>{JSON.stringify(mergedPreview, null, 2)}</pre>
        )}

        <p className="text-foreground-400 text-label-2xs min-h-4 shrink-0">
          {isPreviewPending ? (
            <Skeleton className="h-3 w-full max-w-sm" />
          ) : hasOverride ? (
            'Override merged over the default message body.'
          ) : (
            "No override for this provider. Default message maps to the provider's primary content field."
          )}
        </p>
      </div>
    </div>
  );
};
