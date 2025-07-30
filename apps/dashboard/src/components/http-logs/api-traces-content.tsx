import { useMemo } from 'react';
import { RiLoader4Fill, RiCheckboxCircleFill, RiErrorWarningFill, RiAlertFill, RiTimeFill } from 'react-icons/ri';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import { Badge } from '@/components/primitives/badge';
import { useFetchRequestTraces } from '@/hooks/use-fetch-request-traces';
import { RequestLog, ApiTrace } from '../../types/logs';
import { formatDistanceToNow } from 'date-fns';

type ApiTracesContentProps = {
  log: RequestLog;
};

function getStatusIcon(status: string) {
  switch (status) {
    case 'success':
      return <RiCheckboxCircleFill className="h-4 w-4 text-success" />;
    case 'error':
      return <RiErrorWarningFill className="h-4 w-4 text-destructive" />;
    case 'warning':
      return <RiAlertFill className="h-4 w-4 text-warning" />;
    case 'pending':
      return <RiTimeFill className="h-4 w-4 text-foreground-400" />;
    default:
      return <RiTimeFill className="h-4 w-4 text-foreground-400" />;
  }
}

function getStatusColor(status: string): "stroke" | "filled" | "light" | "lighter" | undefined {
  switch (status) {
    case 'success':
      return 'filled';
    case 'error':
      return 'filled';
    case 'warning':
      return 'filled';
    case 'pending':
      return 'light';
    default:
      return 'light';
  }
}

function TraceRow({ trace }: { trace: ApiTrace }) {
  const createdAt = new Date(trace.createdAt);
  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });

  return (
    <TableRow className="hover:bg-neutral-50">
      <TableCell className="w-12">
        {getStatusIcon(trace.status)}
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-foreground-900">{trace.title}</span>
          {trace.message && (
            <span className="text-xs text-foreground-600 max-w-md truncate">{trace.message}</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={getStatusColor(trace.status)} size="sm" className="capitalize">
          {trace.status}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-foreground-600">
        <span className="font-mono text-xs bg-neutral-100 px-2 py-1 rounded">
          {trace.eventType}
        </span>
      </TableCell>
      <TableCell className="text-xs text-foreground-500">
        <div className="flex flex-col gap-0.5">
          <span>{createdAt.toLocaleTimeString()}</span>
          <span className="text-foreground-400">{timeAgo}</span>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ApiTracesContent({ log }: ApiTracesContentProps) {
  const {
    data: requestTraces,
    isLoading,
    error,
  } = useFetchRequestTraces(
    {
      requestId: log.transactionId!,
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 30000,
    }
  );


  const traces = requestTraces?.traces || [];
  const totalTraces = traces.length;

  console.log(requestTraces);

  const statusCounts = useMemo(() => {
    return traces.reduce(
      (acc, trace) => {
        acc[trace.status] = (acc[trace.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [traces]);

  if (error) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-foreground-600 text-sm">Failed to load API traces</p>
      </div>
    );
  }

  return (
    <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-none bg-white px-3 py-3 pb-2">
        <div className="flex w-full flex-row items-start justify-between">
          <div className="flex w-full flex-col items-start gap-2 text-left">
            <div className="flex flex-col justify-center text-[14px] tracking-[-0.084px] text-[#525866]">
              <p className="leading-[20px] font-medium font-['Inter']">
                <span className="text-[#525866]">{totalTraces}</span>
                <span className="text-[#99a0ae]"> API traces found</span>
              </p>
            </div>
            
            {totalTraces > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-1.5">
                    {getStatusIcon(status)}
                    <span className="text-xs text-foreground-600 capitalize">
                      {status}: {count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full">
          {isLoading ? (
            <div className="p-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="mb-3 flex items-center gap-2 rounded-lg border border-neutral-100 p-3">
                  <div className="h-4 w-4 animate-pulse rounded-full bg-neutral-200" />
                  <div className="flex-1">
                    <div className="mb-1 h-4 w-48 animate-pulse rounded bg-neutral-200" />
                    <div className="h-3 w-32 animate-pulse rounded bg-neutral-200" />
                  </div>
                  <div className="h-3 w-16 animate-pulse rounded bg-neutral-200" />
                  <div className="h-3 w-12 animate-pulse rounded bg-neutral-200" />
                </div>
              ))}
            </div>
          ) : traces.length === 0 ? (
            <div className="flex h-48 items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-foreground-600 text-sm">No API traces found</p>
                <p className="text-foreground-400 text-xs">
                  This request doesn't have any associated trace events
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Status</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-32">Type</TableHead>
                    <TableHead className="w-24">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {traces.map((trace) => (
                    <TraceRow key={trace.id} trace={trace} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
