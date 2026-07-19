import { ChannelTypeEnum, type GeneratePreviewResponseDto } from '@novu/shared';

import { ToolFill } from '@/components/icons/tool-fill';
import { Skeleton } from '@/components/primitives/skeleton';
import { cn } from '@/utils/ui';

type ToolPreviewBody = {
  body?: string;
};

type ToolPreviewResult = {
  type: string;
  preview?: ToolPreviewBody;
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
  const body =
    previewResult?.type === ChannelTypeEnum.TOOL && previewResult.preview?.body ? previewResult.preview.body : '';

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
                className={cn('text-foreground-950 min-h-4 whitespace-pre-wrap text-xs font-normal', {
                  'line-clamp-3': variant === 'mini',
                })}
                title={variant === 'mini' ? body : undefined}
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
};
