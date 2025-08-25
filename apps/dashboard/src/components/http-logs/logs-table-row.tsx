import { TableCell, TableRow } from '@/components/primitives/table';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import { formatDateSimple } from '@/utils/format-date';
import { RequestLog } from '../../types/logs';
import { HttpStatusBadge } from './http-status-badge';
import { MethodBadge } from './method-badge';

type LogsTableRowProps = {
  log: RequestLog;
  onClick?: (log: RequestLog) => void;
  isSelected?: boolean;
};

export function LogsTableRow({ log, onClick, isSelected }: LogsTableRowProps) {
  return (
    <TableRow
      className={`cursor-pointer hover:bg-neutral-50 ${isSelected ? 'bg-bg-weak' : ''}`}
      onClick={() => onClick?.(log)}
    >
      <TableCell className="px-2 py-1.5">
        <div className="flex items-center gap-2">
          <HttpStatusBadge statusCode={log.statusCode} />
          <MethodBadge method={log.method} />
          <span className="text-text-sub font-code text-label-xs">{log.path}</span>
        </div>
      </TableCell>
      <TableCell className="text-text-soft text-label-xs font-code w-[200px] px-2 py-1.5">
        <TimeDisplayHoverCard date={new Date(log.createdAt)} className="block w-full text-right">
          {formatDateSimple(log.createdAt, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          })}
        </TimeDisplayHoverCard>
      </TableCell>
    </TableRow>
  );
}
