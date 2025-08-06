import { StatusBadge } from '@/components/primitives/status-badge';
import { cn } from '@/utils/ui';

type HttpStatusBadgeProps = {
  statusCode: number;
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
    case 402:
      return '402 Payment Required';
    case 404:
      return '404 Not Found';
    case 408:
      return '408 Request Timeout';
    case 422:
      return '422 Unprocessable Entity';
    case 429:
      return '429 Too Many Requests';
    case 500:
      return '500 Internal Server Error';
    default:
      return `${statusCode}`;
  }
}

export function HttpStatusBadge({ statusCode, className }: HttpStatusBadgeProps) {
  const statusBadgeProps = getStatusBadgeProps(statusCode);
  const statusText = getStatusText(statusCode);

  return (
    <StatusBadge {...statusBadgeProps} className={cn('h-5 px-1', className)}>
      {statusText}
    </StatusBadge>
  );
}
