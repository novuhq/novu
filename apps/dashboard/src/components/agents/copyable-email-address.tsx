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
        'border-stroke-soft bg-bg-white flex min-h-8 items-stretch overflow-hidden rounded-lg border shadow-xs',
        className
      )}
    >
      <span className="text-text-sub text-paragraph-xs flex min-w-0 flex-1 items-center break-all px-2 py-1 font-mono leading-4">
        {email}
      </span>
      <div className="border-stroke-soft flex shrink-0 items-center self-stretch border-l">
        <CopyButton size="2xs" valueToCopy={email} className="size-8 shrink-0 justify-center rounded-none" />
        {trailing}
      </div>
    </div>
  );
}
