import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/** The bordered list table used for channels and contacts. Scrolls sideways on narrow screens. */
export function Table({ className, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-background">
      <table className={cn('w-full border-collapse text-left text-sm tracking-tight', className)} {...rest} />
    </div>
  );
}

export function TableHead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-border bg-subtle', className)} {...rest} />;
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
        // The gradient is always there with clear stops, so its colors can fade in instead of jumping.
        'bg-linear-to-r from-accent/0 via-accent/0 to-accent/0 transition-[background-color,--tw-gradient-from,--tw-gradient-via] duration-200 ease-out motion-reduce:transition-none',
        'hover:bg-raised hover:from-accent/12 hover:via-accent/3',
        highlighted && 'bg-raised from-accent/12 via-accent/3',
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
      className={cn(
        'h-9 px-4 font-mono text-[11px] leading-4 font-medium tracking-[0.06em] text-muted uppercase',
        className
      )}
      {...rest}
    />
  );
}

export function TableCell({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('h-14 px-4 text-foreground', className)} {...rest} />;
}
