import type { ComponentProps } from 'react';
import { RiErrorWarningLine, RiRefreshLine } from 'react-icons/ri';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { cn } from '@/utils/ui';

export type ErrorStateProps = Omit<ComponentProps<'div'>, 'children' | 'role'> & {
  title: string;
  detail: string;
  retrying: boolean;
  onRetry?: () => void;
};

export function ErrorState({ title, detail, retrying, onRetry, className, ...props }: ErrorStateProps) {
  if (retrying) {
    return (
      <div
        data-slot="error-state"
        key="retrying"
        className={cn('flex w-full items-center gap-2.5 text-sm', className)}
        {...props}
      >
        <RiRefreshLine className="text-text-soft size-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
        <Shimmer as="span" className="text-text-soft relative inline-block text-sm">
          Retrying
        </Shimmer>
      </div>
    );
  }

  return (
    <div
      data-slot="error-state"
      key="error"
      role="alert"
      className={cn('bg-red-alpha-10 flex w-full items-start gap-2.5 rounded-xl px-4 py-3 text-sm', className)}
      {...props}
    >
      <RiErrorWarningLine className="text-error-base mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-error-base font-medium">{title}</p>
        <p className="text-error-base/70 mt-0.5 text-[13px] leading-snug">{detail}</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="text-error-base hover:bg-red-alpha-10 ms-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
        >
          <RiRefreshLine className="size-3" />
          Retry
        </button>
      ) : null}
    </div>
  );
}
