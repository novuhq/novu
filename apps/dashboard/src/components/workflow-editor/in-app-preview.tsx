import { parseMarkdownIntoTokens } from '@novu/js/internal';
import { HTMLAttributes, ReactNode, useMemo } from 'react';

import { InboxArrowDown } from '@/components/icons/inbox-arrow-down';
import { InboxBell } from '@/components/icons/inbox-bell';
import { InboxEllipsis } from '@/components/icons/inbox-ellipsis';
import { InboxSettings } from '@/components/icons/inbox-settings';
import { Button, ButtonProps } from '@/components/primitives/button';
import { cn } from '@/utils/ui';
import { Skeleton } from '../primitives/skeleton';
import { inboxButtonVariants } from '@/utils/inbox';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { FeatureFlagsKeysEnum } from '@novu/shared';

type InAppPreviewBellProps = HTMLAttributes<HTMLDivElement>;

export const InAppPreviewBell = (props: InAppPreviewBellProps) => {
  const { className, ...rest } = props;
  return (
    <div className={cn('flex items-center justify-end p-2 text-neutral-300', className)} {...rest}>
      <span className="relative rounded-lg bg-neutral-50 p-1">
        <InboxBell className="relative size-5" />
        <div className="bg-primary border-background absolute right-1 top-1 h-2 w-2 translate-y-[1px] rounded-full border border-solid" />
      </span>
    </div>
  );
};

type InAppPreviewProps = HTMLAttributes<HTMLDivElement>;

export const InAppPreview = (props: InAppPreviewProps) => {
  const { className, ...rest } = props;
  const isInboxV3Enabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_INBOX_V3_ENABLED);

  if (isInboxV3Enabled) {
    return (
      <div
        className={cn(
          'border-foreground-200 to-background/90 pointer-events-none relative mx-auto flex h-full w-full flex-col rounded-xl shadow-sm',
          className
        )}
        {...rest}
      />
    );
  }

  return (
    <div
      className={cn(
        'border-foreground-200 to-background/90 pointer-events-none relative mx-auto flex h-full w-full flex-col gap-4 rounded-xl px-4 py-3 shadow-sm',
        className
      )}
      {...rest}
    />
  );
};

type InAppPreviewHeaderProps = HTMLAttributes<HTMLDivElement>;

export const InAppPreviewHeader = (props: InAppPreviewHeaderProps) => {
  const { className, ...rest } = props;
  const isInboxV3Enabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_INBOX_V3_ENABLED);

  if (isInboxV3Enabled) {
    return (
      <div
        className={cn(
          'border-b-neutral-alpha-100 z-20 flex items-center justify-between rounded-t-xl border-b bg-[oklch(from_#525252_l_c_h/0.025)] px-4 pb-2 pt-2.5 text-neutral-300',
          className
        )}
        {...rest}
      >
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium">Inbox</span>
          <InboxArrowDown />
        </div>
        <div className="flex items-center gap-2">
          <span className="p-0.5">
            <InboxEllipsis />
          </span>
          <span>
            <InboxSettings className="size-5" />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('z-20 flex items-center justify-between text-neutral-300', className)} {...rest}>
      <div className="flex items-center gap-2">
        <span className="text-xl font-medium">Inbox</span>
        <InboxArrowDown />
      </div>
      <div className="flex items-center gap-2">
        <span className="p-0.5">
          <InboxEllipsis />
        </span>
        <span>
          <InboxSettings />
        </span>
      </div>
    </div>
  );
};

type InAppPreviewAvatarProps = HTMLAttributes<HTMLImageElement> & {
  src?: string;
  isPending?: boolean;
};

export const InAppPreviewAvatar = (props: InAppPreviewAvatarProps) => {
  const { className, isPending, src, ...rest } = props;
  const isInboxV3Enabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_INBOX_V3_ENABLED);

  if (isPending) {
    return <Skeleton className="size-8 shrink-0 rounded-full" />;
  }

  if (!src) {
    return isInboxV3Enabled ? <div className={cn('bg-background size-7 rounded-full')} /> : null;
  }

  return <img src={src} alt="avatar" className={cn('bg-background size-7 rounded-full')} {...rest} />;
};

type InAppPreviewNotificationProps = HTMLAttributes<HTMLDivElement>;

export const InAppPreviewNotification = (props: InAppPreviewNotificationProps) => {
  const { className, ...rest } = props;
  const isInboxV3Enabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_INBOX_V3_ENABLED);

  return <div className={cn(isInboxV3Enabled ? 'flex gap-2 p-4' : 'flex gap-2', className)} {...rest} />;
};

type InAppPreviewNotificationContentProps = HTMLAttributes<HTMLDivElement>;

export const InAppPreviewNotificationContent = (props: InAppPreviewNotificationContentProps) => {
  const { className, ...rest } = props;

  return <div className={cn('flex w-full flex-col gap-1 overflow-hidden', className)} {...rest} />;
};

type InAppPreviewSubjectProps = MarkdownProps & { isPending?: boolean };

export const InAppPreviewSubject = (props: InAppPreviewSubjectProps) => {
  const { className, isPending, ...rest } = props;

  if (isPending) {
    return <Skeleton className="h-5 w-1/2" />;
  }

  return (
    <Markdown
      className={cn('text-foreground-600 truncate text-xs font-medium', className)}
      {...rest}
      data-testid="in-app-preview-subject"
    />
  );
};

type InAppPreviewBodyProps = MarkdownProps & { isPending?: boolean };

export const InAppPreviewBody = (props: InAppPreviewBodyProps) => {
  const { className, isPending, ...rest } = props;

  if (isPending) {
    return (
      <>
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
      </>
    );
  }

  return (
    <Markdown
      className={cn('text-foreground-400 whitespace-pre-wrap text-xs font-normal', className)}
      {...rest}
      data-testid="in-app-preview-body"
    />
  );
};

type InAppPreviewActionsProps = HTMLAttributes<HTMLDivElement>;

export const InAppPreviewActions = (props: InAppPreviewActionsProps) => {
  const { className, ...rest } = props;
  const isInboxV3Enabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_INBOX_V3_ENABLED);

  return (
    <div
      className={cn(`mt-3 flex flex-wrap gap-1 ${isInboxV3Enabled ? 'py-px' : 'overflow-hidden'}`, className)}
      {...rest}
    />
  );
};

type InAppPreviewPrimaryActionProps = { isPending?: boolean; children?: ReactNode; className?: string };

export const InAppPreviewPrimaryAction = (props: InAppPreviewPrimaryActionProps) => {
  const { className, isPending, children, ...rest } = props;
  const isInboxV3Enabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_INBOX_V3_ENABLED);

  if (isPending) {
    return <Skeleton className="h-5 w-[12ch]" />;
  }

  if (!children) {
    return null;
  }

  if (isInboxV3Enabled) {
    return (
      <button
        className={inboxButtonVariants({
          variant: 'default',
          className,
        })}
        {...rest}
      >
        {children}
      </button>
    );
  }

  return (
    <Button
      className={cn('h-6 px-3 text-xs font-medium shadow-none', className)}
      type="button"
      variant="primary"
      size="2xs"
      {...rest}
    >
      {children}
    </Button>
  );
};

type InAppPreviewSecondaryActionProps = ButtonProps & { isPending?: boolean };

export const InAppPreviewSecondaryAction = (props: InAppPreviewSecondaryActionProps) => {
  const { className, isPending, children, ...rest } = props;
  const isInboxV3Enabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_INBOX_V3_ENABLED);

  if (isPending) {
    return <Skeleton className="h-5 w-[12ch]" />;
  }

  if (!children) {
    return null;
  }

  if (isInboxV3Enabled) {
    return (
      <button
        className={inboxButtonVariants({
          variant: 'secondary',
          className,
        })}
        {...rest}
      >
        {children}
      </button>
    );
  }

  return (
    <Button
      variant="secondary"
      mode="outline"
      className={cn('h-6 px-3 text-xs font-medium', className)}
      type="button"
      size="2xs"
      {...rest}
    >
      {children}
    </Button>
  );
};

type MarkdownProps = Omit<HTMLAttributes<HTMLParagraphElement>, 'children'> & { children?: string };

const Markdown = (props: MarkdownProps) => {
  const { children, ...rest } = props;

  const tokens = useMemo(() => parseMarkdownIntoTokens(children || ''), [children]);

  return (
    <p {...rest}>
      {tokens.map((token, index) => {
        if (token.type === 'bold') {
          return <strong key={index}>{token.content}</strong>;
        } else {
          return <span key={index}>{token.content}</span>;
        }
      })}
    </p>
  );
};
