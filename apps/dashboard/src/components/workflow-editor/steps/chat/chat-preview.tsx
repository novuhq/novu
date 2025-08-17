import { ChannelTypeEnum, ChatRenderOutput, GeneratePreviewResponseDto } from '@novu/shared';
import { RiSendPlane2Fill } from 'react-icons/ri';

import { LogoCircle } from '@/components/icons';
import { Skeleton } from '@/components/primitives/skeleton';
import { cn } from '@/utils/ui';

export const ChatPreview = ({
  isPreviewPending,
  previewData,
  variant = 'default',
}: {
  isPreviewPending: boolean;
  previewData?: GeneratePreviewResponseDto;
  variant?: 'mini' | 'default';
}) => {
  const isValidChatPreview =
    previewData?.result.type === ChannelTypeEnum.CHAT && previewData?.result.preview.body?.length > 0;
  const body = isValidChatPreview ? ((previewData?.result.preview as ChatRenderOutput)?.body ?? '') : '';

  return (
    <div className="relative w-full rounded-xl border border-dashed border-[#E1E4EA] p-3">
      <div className="flex flex-col gap-3">
        <div className="flex w-full items-start gap-2">
          <div className="flex size-6 items-center rounded-[5px] bg-neutral-800 p-0.5 text-sm font-medium">
            <LogoCircle />
          </div>
          <div className="flex w-full flex-col gap-1">
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
                className={cn('text-foreground-950 min-h-4 whitespace-pre-wrap text-xs font-normal', {
                  'line-clamp-3': variant === 'mini',
                })}
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
      <div className="to-background absolute -bottom-1 -left-1 -right-1 z-0 h-16 bg-gradient-to-b from-transparent to-80%" />
    </div>
  );
};
