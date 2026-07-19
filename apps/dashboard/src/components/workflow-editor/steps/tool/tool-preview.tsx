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
import { cn } from '@/utils/ui';
import { getToolOverrideProviderDisplayName, mergeToolProviderPreview } from './tool-content-source';

type ToolPreviewResult = {
  type: string;
  preview?: ToolRenderOutput;
};

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

  const availableProviders = useMemo(() => {
    const fromOverrides = Object.keys(providerOverrides).filter(isToolContentOverrideProviderId);

    if (fromOverrides.length > 0) {
      return fromOverrides;
    }

    return [...TOOL_CONTENT_OVERRIDE_PROVIDER_IDS];
  }, [providerOverrides]);

  const [selectedProviderId, setSelectedProviderId] = useState<ToolContentOverrideProviderId>(
    availableProviders[0] ?? TOOL_CONTENT_OVERRIDE_PROVIDER_IDS[0]
  );

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
      <div className="relative w-full rounded-xl border border-dashed border-[#E1E4EA] p-3">
        <div className="flex flex-col gap-3">
          <div className="flex w-full items-start gap-2">
            <div className="flex size-6 items-center justify-center rounded-[5px] bg-warning/10 text-warning">
              <ToolFill className="size-3.5" />
            </div>
            <div className="flex w-full flex-col gap-1">
              <div className="flex items-center gap-1">
                <span className="text-foreground-950 text-xs font-bold">Tool</span>
                <span className="text-2xs text-foreground-600 bg-neutral-alpha-100 flex h-4 items-center rounded-sm px-1 opacity-70">
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
        <div className="to-background absolute -bottom-1 -left-1 -right-1 z-0 h-16 bg-linear-to-b from-transparent to-80%" />
      </div>
    );
  }

  return (
    <div className="relative flex w-full flex-col gap-3 rounded-xl border border-dashed border-[#E1E4EA] p-3">
      <div className="flex items-center justify-between gap-2">
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

      {isPreviewPending ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-foreground-600 text-2xs font-medium uppercase tracking-wide">
              {hasOverride ? 'Merged request body' : 'Default content mapping'}
            </span>
            {hasOverride && (
              <span className="bg-neutral-alpha-100 text-foreground-600 rounded px-1 text-[10px] font-medium">
                OVERRIDDEN
              </span>
            )}
          </div>
          <pre
            className={cn(
              'bg-neutral-alpha-50 text-foreground-950 max-h-64 overflow-auto rounded-md border border-neutral-100 p-2 font-mono text-[11px] leading-4'
            )}
          >
            {JSON.stringify(mergedPreview, null, 2)}
          </pre>
          {!hasOverride && (
            <p className="text-foreground-400 text-2xs">
              No override for this provider — default message maps to the provider&apos;s primary content field.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
