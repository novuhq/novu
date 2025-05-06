import { cn } from '@/utils/ui';
import { DirectionEnum } from '@novu/shared';
import { cva } from 'class-variance-authority';
import * as React from 'react';
import { RiArrowDownSFill, RiArrowUpSFill, RiExpandUpDownFill } from 'react-icons/ri';

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  containerClassname?: string;
  isLoading?: boolean;
  loadingRowsCount?: number;
  loadingRow?: React.ReactNode;
}

export type TableHeadSortDirection = DirectionEnum | false;
interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: TableHeadSortDirection;
  onSort?: () => void;
}

type TableHeaderProps = React.HTMLAttributes<HTMLTableSectionElement>;
type TableBodyProps = React.HTMLAttributes<HTMLTableSectionElement>;
type TableFooterProps = React.HTMLAttributes<HTMLTableSectionElement>;
type TableRowProps = React.HTMLAttributes<HTMLTableRowElement>;
type TableCellProps = React.TdHTMLAttributes<HTMLTableCellElement>;

const LoadingRow = () => (
  <TableRow>
    <TableCell className="animate-pulse" colSpan={100}>
      <div className="h-8 w-full rounded-md bg-neutral-100" />
    </TableCell>
  </TableRow>
);

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, containerClassname, isLoading, loadingRowsCount = 5, loadingRow, children, ...props }, ref) => (
    <div
      className={cn(
        'border-neutral-alpha-200 shadow-xs relative w-full overflow-x-auto rounded-lg border',
        containerClassname
      )}
    >
      <table
        ref={ref}
        className={cn('relative w-full caption-bottom border-separate border-spacing-0 text-sm', className)}
        {...props}
      >
        {children}
        {isLoading && (
          <TableBody>
            {Array.from({ length: loadingRowsCount }).map((_, index) => (
              <React.Fragment key={index}>{loadingRow || <LoadingRow />}</React.Fragment>
            ))}
          </TableBody>
        )}
      </table>
    </div>
  )
);
Table.displayName = 'Table';

const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('sticky top-0 z-10 bg-neutral-50 shadow-[0_0_0_1px_hsl(var(--neutral-alpha-200))]', className)}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, children, sortable, sortDirection, onSort, ...props }, ref) => {
    const content = (
      <div className={cn('flex items-center gap-1', sortable && 'hover:text-foreground-900 cursor-pointer')}>
        {children}
        {sortable && (
          <>
            {sortDirection === DirectionEnum.ASC && <RiArrowUpSFill className="text-text-sub-600 size-4" />}
            {sortDirection === DirectionEnum.DESC && <RiArrowDownSFill className="text-text-sub-600 size-4" />}
            {!sortDirection && <RiExpandUpDownFill className="text-text-sub-600 size-4" />}
          </>
        )}
      </div>
    );

    return (
      <th
        ref={ref}
        className={cn(
          'text-foreground-600 h-10 px-6 py-2 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
          className
        )}
        {...props}
      >
        {sortable ? (
          <div role="button" onClick={onSort}>
            {content}
          </div>
        ) : (
          content
        )}
      </th>
    );
  }
);
TableHead.displayName = 'TableHead';

const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('', className)} {...props} />
));
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<HTMLTableSectionElement, TableFooterProps>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn('bg-background sticky bottom-0 shadow-[0_0_0_1px_hsl(var(--neutral-alpha-200))]', className)}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn('[&>td]:border-neutral-alpha-100 [&>td]:border-b [&>td]:last-of-type:border-0', className)}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

export const tableCellVariants = cva(`px-6 py-2 align-middle`);

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(({ className, ...props }, ref) => (
  <td ref={ref} className={cn(tableCellVariants(), className)} {...props} />
));
TableCell.displayName = 'TableCell';

export { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow };
