import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  /** A control on the right, level with the title. */
  action?: ReactNode;
};

/** The title block at the top of a dashboard page. */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[22px] leading-tight tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-sm tracking-tight text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}
