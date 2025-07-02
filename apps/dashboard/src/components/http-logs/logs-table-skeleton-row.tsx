import { TableCell, TableRow } from '@/components/primitives/table';
import { Skeleton } from '@/components/primitives/skeleton';

export function LogsTableSkeletonRow() {
  return (
    <TableRow className="hover:bg-neutral-50">
      <TableCell className="px-2 py-1.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-sm" />
          <Skeleton className="h-4 w-12 rounded-sm" />
          <Skeleton className="h-4 w-32 rounded-sm" />
        </div>
      </TableCell>
      <TableCell className="w-[175px] px-2 py-1.5">
        <div className="flex justify-end">
          <Skeleton className="h-4 w-28 rounded-sm" />
        </div>
      </TableCell>
    </TableRow>
  );
}
