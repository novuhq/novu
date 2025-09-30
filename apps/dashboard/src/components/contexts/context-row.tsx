import { ComponentProps } from 'react';
import { RiFileCopyLine, RiMore2Fill } from 'react-icons/ri';
import { ContextResponseDto } from '@/api/contexts';
import { Badge } from '@/components/primitives/badge';
import { CompactButton } from '@/components/primitives/button-compact';
import { CopyButton } from '@/components/primitives/copy-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { Skeleton } from '@/components/primitives/skeleton';
import { TableCell, TableRow } from '@/components/primitives/table';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import { formatDateSimple } from '@/utils/format-date';
import { cn } from '@/utils/ui';

type ContextRowProps = {
  context: ContextResponseDto;
};

type ContextTableCellProps = ComponentProps<typeof TableCell>;

const ContextTableCell = (props: ContextTableCellProps) => {
  const { children, className, ...rest } = props;

  return (
    <TableCell className={cn('group-hover:bg-neutral-alpha-50 text-text-sub relative', className)} {...rest}>
      {children}
    </TableCell>
  );
};

export const ContextRow = ({ context }: ContextRowProps) => {
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <TableRow className="group relative isolate">
      <ContextTableCell>
        <div className="flex items-center">
          <span className="max-w-[300px] truncate font-medium">{context.id}</span>
        </div>
      </ContextTableCell>
      <ContextTableCell>
        <div className="flex items-center">
          <Badge variant="lighter" color="purple" size="md">
            {context.type}
          </Badge>
        </div>
      </ContextTableCell>
      <ContextTableCell>
        {context.createdAt && (
          <TimeDisplayHoverCard date={context.createdAt}>{formatDateSimple(context.createdAt)}</TimeDisplayHoverCard>
        )}
      </ContextTableCell>
      <ContextTableCell>
        {context.updatedAt && (
          <TimeDisplayHoverCard date={context.updatedAt}>{formatDateSimple(context.updatedAt)}</TimeDisplayHoverCard>
        )}
      </ContextTableCell>
      <ContextTableCell className="w-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <CompactButton icon={RiMore2Fill} variant="ghost" className="z-10 h-8 w-8 p-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-44" onClick={stopPropagation}>
            <DropdownMenuGroup>{/* No actions available for now */}</DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </ContextTableCell>
    </TableRow>
  );
};

export const ContextRowSkeleton = () => {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-6 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-32" />
      </TableCell>
      <TableCell className="w-1">
        <RiMore2Fill className="size-4 opacity-50" />
      </TableCell>
    </TableRow>
  );
};
