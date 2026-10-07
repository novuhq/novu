import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/** The bordered list table used for channels and contacts. Scrolls sideways on narrow screens. */
export function Table({ className, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-subtle">
      <table className={cn('w-full border-collapse text-left text-sm tracking-tight', className)} {...rest} />
    </div>
  );
}

export function TableHead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-border', className)} {...rest} />;
}

export function TableBody({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-border', className)} {...rest} />;
}

type TableRowProps = HTMLAttributes<HTMLTableRowElement> & {
  /** Marks the row that needs attention, for example a channel that isn't set up yet. */
  highlighted?: boolean;
};

export function TableRow({ highlighted = false, className, ...rest }: TableRowProps) {
  return (
    <tr
      className={cn(
        'transition-colors hover:bg-raised motion-reduce:transition-none',
        highlighted && 'bg-pending-subtle/40',
        className
      )}
      {...rest}
    />
  );
}

export function TableHeaderCell({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn('h-9 px-3 font-mono text-[11px] font-normal tracking-wider text-muted uppercase', className)}
      {...rest}
    />
  );
}

export function TableCell({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('h-14 px-3 text-foreground', className)} {...rest} />;
}
