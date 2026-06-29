import { type ReactNode } from 'react';
import { CopyButton } from '@/components/primitives/copy-button';
import { cn } from '@/utils/ui';

type CopyableEmailAddressProps = {
  email: string;
  className?: string;
  trailing?: ReactNode;
};

export function CopyableEmailAddress({ email, className, trailing }: CopyableEmailAddressProps) {
  return (
    <div
      className={cn(
        'border-stroke-soft bg-bg-white nv-no-scrollbar inline-flex h-8 w-fit max-w-full items-center overflow-x-auto rounded-lg border shadow-xs',
        className
      )}
    >
      <span className="text-text-sub text-label-xs px-2 font-mono whitespace-nowrap">{email}</span>
      <div className="border-stroke-soft flex h-8 shrink-0 items-center border-l">
        <CopyButton size="2xs" valueToCopy={email} className="size-8 shrink-0 justify-center rounded-none" />
        {trailing}
      </div>
    </div>
  );
}
