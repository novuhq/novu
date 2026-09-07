import { ChannelTypeEnum, ChatRenderOutput, GeneratePreviewResponseDto } from '@novu/shared';
import { RiSendPlane2Fill } from 'react-icons/ri';

import { LogoCircle } from '@/components/icons';
import { Skeleton } from '@/components/primitives/skeleton';
import { cn } from '@/utils/ui';

/**
 * Legacy chat preview: the neutral dashed-border bubble shown whenever the rich block editor is
 * disabled (`IS_CHAT_BLOCK_EDITOR_ENABLED` off) and in compact surfaces (the Configure Step sidebar
 * and the canvas hover card). `mini` clamps the body to three lines; `default` shows the full
 * message and a taller composer. The rich provider-shell/card preview lives in
 * `ChatBlockEditorPreview` and is never routed through here.
 */
export const ChatPreview = ({
  isPreviewPending,
  previewData,
  variant = 'default',
}: {
  isPreviewPending: boolean;
  previewData?: GeneratePreviewResponseDto;
  variant?: 'mini' | 'default';
  /** Accepted for call-site compatibility; the legacy preview has no platform selector. */
  showPlatformSelector?: boolean;
}) => {
  const chatPreview =
    previewData?.result?.type === ChannelTypeEnum.CHAT ? (previewData.result.preview as ChatRenderOutput) : undefined;
  const body = chatPreview?.body ?? '';

  return (
    <div className="relative w-full min-w-0 rounded-xl border border-dashed border-[#E1E4EA] p-3">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex w-full min-w-0 items-start gap-2">
          <div className="flex size-6 min-w-6 items-center rounded-[5px] bg-neutral-800 p-0.5 text-sm font-medium">
            <LogoCircle />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-1">
              <span className="text-foreground-950 text-xs font-bold">Novu</span>
              <span className="text-2xs text-foreground-600 bg-neutral-alpha-100 flex h-4 items-center rounded-sm px-1 opacity-70">
                APP
              </span>
              <span className="text-foreground-600 text-2xs opacity-70">12:45</span>
            </div>
            {isPreviewPending ? (
              <Skeleton className="h-4 w-1/2" />
            ) : (
              <span
                className={cn(
                  'text-foreground-950 min-h-4 w-full min-w-0 whitespace-pre-wrap wrap-anywhere text-xs font-normal',
                  {
                    'line-clamp-3': variant === 'mini',
                  }
                )}
                title={variant === 'mini' ? body : undefined}
              >
                {body}
              </span>
            )}
          </div>
        </div>
        <div
          className={cn('relative z-10 flex items-start rounded-sm border border-neutral-100 px-2 py-1', {
            'pb-6': variant === 'default',
          })}
        >
          <div className="flex w-full items-center justify-between">
            <span className="text-foreground-300 text-xs font-normal">Jot something down</span>
            <RiSendPlane2Fill className="text-foreground-300 size-3" />
          </div>
        </div>
      </div>
      <div className="to-background absolute -bottom-1 -left-1 -right-1 z-0 h-16 bg-linear-to-b from-transparent to-80%" />
    </div>
  );
};
