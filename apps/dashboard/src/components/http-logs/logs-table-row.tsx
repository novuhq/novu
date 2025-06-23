import { TableCell, TableRow } from '@/components/primitives/table';
import { StatusBadge } from '@/components/primitives/status-badge';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import { formatDateSimple } from '@/utils/format-date';
import { HttpLog } from '../../types/logs';
import { MethodBadge } from './method-badge';

type LogsTableRowProps = {
  log: HttpLog;
  onClick?: (log: HttpLog) => void;
  isSelected?: boolean;
};

function getStatusBadgeProps(statusCode: number) {
  if (statusCode >= 200 && statusCode < 300) {
    return { status: 'completed' as const, variant: 'light' as const };
  }

  if (statusCode >= 400 && statusCode < 500) {
    return { status: 'pending' as const, variant: 'light' as const };
  }

  if (statusCode >= 500) {
    return { status: 'failed' as const, variant: 'light' as const };
  }

  return { status: 'disabled' as const, variant: 'light' as const };
}

function getStatusText(statusCode: number): string {
  switch (statusCode) {
    case 200:
      return '200 OK';
    case 201:
      return '201 Created';
    case 400:
      return '400 Bad Request';
    case 401:
      return '401 Unauthorized';
    case 404:
      return '404 Not Found';
    case 408:
      return '408 Request Timeout';
    case 429:
      return '429 Too Many Requests';
    case 500:
      return '500 Internal Server Error';
    default:
      return `${statusCode}`;
  }
}

export function LogsTableRow({ log, onClick, isSelected }: LogsTableRowProps) {
  const statusBadgeProps = getStatusBadgeProps(log.statusCode);
  const statusText = getStatusText(log.statusCode);

  return (
    <TableRow
      className={`cursor-pointer hover:bg-neutral-50 ${isSelected ? 'bg-bg-weak' : ''}`}
      onClick={() => onClick?.(log)}
    >
      <TableCell className="px-2 py-1.5">
        <div className="flex items-center gap-2">
          <StatusBadge {...statusBadgeProps} className="h-5 px-1">
            {statusText}
          </StatusBadge>
          <MethodBadge method={log.method} />
          <span className="text-text-sub font-code text-label-xs">{log.path}</span>
        </div>
      </TableCell>
      <TableCell className="text-text-soft text-label-xs font-code w-[175px] px-2 py-1.5">
        <TimeDisplayHoverCard date={new Date(log.timestamp)} className="block w-full">
          {formatDateSimple(log.timestamp, {
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
