import { ReactNode } from 'react';
import { LoadingIndicator } from '@/components/primitives/loading-indicator';
import { cn } from '@/utils/ui';

type PanelHeaderProps = {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  children?: ReactNode;
  className?: string;
  isLoading?: boolean;
};

export function PanelHeader({ icon: Icon, title, children, className, isLoading }: PanelHeaderProps) {
  return (
    <div className={cn('border-b border-neutral-200 p-3', className)}>
      <div className="flex h-full items-center justify-between">
        <h3 className="text-label-sm text-text-strong flex items-center gap-2 font-medium">
          {Icon && <Icon className="size-3.5" />}
          {title}
          {isLoading && <LoadingIndicator size="sm" />}
        </h3>
        {children}
      </div>
    </div>
  );
}
