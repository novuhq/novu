import { RiCheckboxCircleFill, RiErrorWarningFill, RiLoader4Fill, RiTimeFill } from 'react-icons/ri';
import { useFetchRequestTraces } from '@/hooks/use-fetch-request-traces';
import type { ApiTrace, RequestLog } from '../../types/logs';
import { formatDateSimple } from '../../utils/format-date';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../primitives/hover-card';
import { Skeleton } from '../primitives/skeleton';
import { StatusBadge, StatusBadgeIcon } from '../primitives/status-badge';
import { TimeDisplayHoverCard } from '../time-display-hover-card';

type ApiTracesContentProps = {
  log: RequestLog;
};

function mapTraceStatusToBadgeStatus(traceStatus: ApiTrace['status']) {
  switch (traceStatus) {
    case 'success':
      return 'completed';
    case 'error':
      return 'failed';
    case 'warning':
      return 'pending';
    case 'pending':
      return 'pending';
    default:
      return 'disabled';
  }
}

function getStatusIcon(status: ApiTrace['status']) {
  switch (status) {
    case 'success':
      return RiCheckboxCircleFill;
    case 'error':
      return RiErrorWarningFill;
    case 'warning':
      return RiTimeFill;
    case 'pending':
      return RiLoader4Fill;
    default:
      return RiCheckboxCircleFill;
  }
}

function formatRawData(rawData: string): string {
  try {
    return JSON.stringify(JSON.parse(rawData), null, 2);
  } catch {
    return rawData;
  }
}

function TraceEventSkeleton() {
  return (
    <div className="flex items-center gap-2 w-full h-6">
      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]">
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <div className="flex-1">
        <div className="bg-white rounded flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div>
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div>
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TraceEvent({ trace }: { trace: ApiTrace }) {
  const badgeStatus = mapTraceStatusToBadgeStatus(trace.status);
  const StatusIcon = getStatusIcon(trace.status);

  return (
    <div className="flex items-center gap-2 w-full h-6">
      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]">
        <StatusBadge variant="stroke" status={badgeStatus} className="h-4 w-4 border-0 px-0 ring-0">
          <StatusBadgeIcon as={StatusIcon} />
        </StatusBadge>
      </div>
      <div className="flex-1">
        <div className="bg-white rounded flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div>
              {trace.rawData ? (
                <HoverCard openDelay={200}>
                  <HoverCardTrigger asChild>
                    <p className="text-label-xs font-medium text-text-sub whitespace-pre border-b border-dotted border-text-sub cursor-help">
                      {trace.title}
                    </p>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-96 max-h-80 overflow-auto">
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-text-strong">Raw Data</div>
                      <pre className="text-xs bg-neutral-50 rounded p-2 overflow-auto font-mono text-text-sub">
                        {formatRawData(trace.rawData)}
                      </pre>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              ) : (
                <p className="text-label-xs font-medium text-text-sub whitespace-pre">{trace.title}</p>
              )}
            </div>
          </div>
          <div>
            <TimeDisplayHoverCard
              date={new Date(trace.createdAt)}
              className="text-right text-text-soft text-[10px] font-code h-4"
            >
              {formatDateSimple(trace.createdAt, {
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
      </div>
    </div>
  );
}

export function ApiTracesContent({ log }: ApiTracesContentProps) {
  const {
    data: requestTraces,
    isLoading,
    error,
  } = useFetchRequestTraces(
    {
      requestId: log.id || '',
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 30000,
    }
  );

  const traces = requestTraces?.traces || [];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1 p-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <TraceEventSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-foreground-600 text-sm">Failed to load API traces</p>
      </div>
    );
  }

  if (traces.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-foreground-600 text-sm">No traces available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-3">
      {traces.map((trace) => (
        <TraceEvent key={trace.id} trace={trace} />
      ))}
    </div>
  );
}
