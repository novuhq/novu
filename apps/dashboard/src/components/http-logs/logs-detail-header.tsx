import { StatusBadge } from '@/components/primitives/status-badge';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import { formatDateSimple } from '@/utils/format-date';
import { HttpLog } from '../../types/logs';
import { MethodBadge } from './method-badge';

type LogsDetailHeaderProps = {
  log: HttpLog;
  className?: string;
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

export function LogsDetailHeader({ log, className }: LogsDetailHeaderProps) {
  const statusBadgeProps = getStatusBadgeProps(log.statusCode);
  const statusText = getStatusText(log.statusCode);

  return (
    <div className={`border-b border-neutral-200 bg-white p-4 ${className || ''}`}>
      <div className="mb-2 flex items-center gap-2">
        <StatusBadge {...statusBadgeProps} className="h-5 px-1">
          {statusText}
        </StatusBadge>
        <MethodBadge method={log.method} />
      </div>

      <div className="mb-2">
        <span className="text-foreground-900 font-code text-sm font-medium">{log.path}</span>
      </div>

      <div className="text-foreground-600 text-xs">
        <TimeDisplayHoverCard date={new Date(log.timestamp)}>
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
      </div>
    </div>
  );
}
