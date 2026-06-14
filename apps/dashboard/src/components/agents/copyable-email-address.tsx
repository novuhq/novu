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
        'border-stroke-soft bg-bg-white flex items-start gap-2 rounded-lg border px-2.5 py-2 shadow-xs',
        className
      )}
    >
      <span className="text-text-sub text-paragraph-xs min-w-0 flex-1 break-all font-mono leading-5">{email}</span>
      <div className="flex shrink-0 items-start gap-1">
        <CopyButton size="2xs" valueToCopy={email} className="size-6 shrink-0 justify-center" />
        {trailing}
      </div>
    </div>
  );
}
