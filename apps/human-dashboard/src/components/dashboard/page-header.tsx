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
      <div className="flex flex-col gap-1.5 pb-1">
        <h1 className="text-2xl leading-7.5 tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-[13px] leading-4.5 text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}
