import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/ui';
import { AppBreadcrumb } from './app-breadcrumb';

type ShellTopBarProps = HTMLAttributes<HTMLDivElement> & {
  startItems?: ReactNode;
  hideBridgeUrl?: boolean;
};

export function ShellTopBar(props: ShellTopBarProps) {
  const { startItems, className, ...rest } = props;

  return (
    <div
      className={cn(
        'bg-background flex h-12 w-full items-center justify-between border-b border-b-neutral-200 px-2.5 py-1.5',
        className
      )}
      {...rest}
    >
      <div className="flex items-center gap-2">
        <AppBreadcrumb pageNode={startItems} />
      </div>
    </div>
  );
}
