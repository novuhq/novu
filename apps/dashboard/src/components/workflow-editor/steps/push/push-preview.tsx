import { Skeleton } from '@/components/primitives/skeleton';
import { cn } from '@/utils/ui';
import { ChannelTypeEnum, GeneratePreviewResponseDto, PushRenderOutput } from '@novu/shared';
import { HTMLMotionProps, motion } from 'motion/react';
import { HTMLAttributes } from 'react';

export function PushPreview({
  isPreviewPending,
  previewData,
}: {
  isPreviewPending: boolean;
  previewData?: GeneratePreviewResponseDto;
}) {
  const isValidPushPreview = previewData?.result.type === ChannelTypeEnum.PUSH;
  const subject = isValidPushPreview ? ((previewData?.result.preview as PushRenderOutput)?.subject ?? '') : '';
  const body = isValidPushPreview ? ((previewData?.result.preview as PushRenderOutput)?.body ?? '') : '';

  if (isPreviewPending) {
    return (
      <PushBackgroundWithPhone>
        <PushNotificationContainer>
          <PushContentContainerPreview className="relative z-10">
            <PushSubjectPreview isPending />
            <PushBodyPreview isPending />
          </PushContentContainerPreview>
        </PushNotificationContainer>
      </PushBackgroundWithPhone>
    );
  }

  return (
    <PushBackgroundWithPhone>
      <PushNotificationContainer>
        <PushContentContainerPreview className="relative z-10">
          <PushSubjectPreview subject={subject} isPending={isPreviewPending} />
          <PushBodyPreview body={body} isPending={isPreviewPending} />
        </PushContentContainerPreview>
        <PushContentContainerPreview className="-mt-5 h-6 scale-95" />
        <PushContentContainerPreview className="-mt-5 h-6 scale-90" />
      </PushNotificationContainer>
    </PushBackgroundWithPhone>
  );
}

type PushSubjectPreviewProps = HTMLAttributes<HTMLDivElement> & {
  subject?: string;
  isPending: boolean;
};

export const PushSubjectPreview = ({ subject, isPending, className, ...rest }: PushSubjectPreviewProps) => {
  if (isPending) {
    return <Skeleton className="h-3 w-2/3" />;
  }

  return (
    <div className={cn('flex items-center gap-1.5 whitespace-pre-wrap', className)} {...rest}>
      <div className="flex-1">
        <span className="line-clamp-1 min-h-4 text-xs font-medium">{subject}</span>
      </div>
      <span className="text-2xs text-neutral-500">now</span>
    </div>
  );
};

type PushBodyPreviewProps = HTMLAttributes<HTMLDivElement> & {
  body?: string;
  isPending: boolean;
};

export const PushBodyPreview = ({ body, isPending, className, ...rest }: PushBodyPreviewProps) => {
  if (isPending) {
    return (
      <div className="flex flex-col gap-1 whitespace-pre-wrap" {...rest}>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }

  return (
    <div className={cn('flex items-center', className)} {...rest}>
      <span className="text-2xs line-clamp-3 min-h-3.5">{body}</span>
    </div>
  );
};

export const PushContentContainerPreview = ({ children, className, ...rest }: HTMLMotionProps<'div'>) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn('flex w-full flex-col gap-0.5 rounded-md bg-neutral-50 p-1.5', className)}
      layout
      {...rest}
    >
      {children}
    </motion.div>
  );
};

export const PushBackgroundWithPhone = ({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className="flex items-center justify-center">
      <div
        className={cn("relative h-60 w-full max-w-72 bg-[url('/images/phones/iphone-push.svg')] bg-cover", className)}
        {...rest}
      >
        {children}
      </div>
    </div>
  );
};

export const PushNotificationContainer = ({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={cn('absolute bottom-5 left-1/2 z-10 w-11/12 -translate-x-1/2 p-2', className)} {...rest}>
      {children}
    </div>
  );
};
