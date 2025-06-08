import { ReactNode } from 'react';
import { cn } from '@/utils/ui';

type PanelHeaderProps = {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  children?: ReactNode;
  className?: string;
};

export function PanelHeader({ icon: Icon, title, children, className }: PanelHeaderProps) {
  return (
    <div className={cn('border-b border-neutral-200 p-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-label-sm text-text-strong flex items-center gap-2 font-medium">
          {Icon && <Icon className="size-3.5" />}
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}
