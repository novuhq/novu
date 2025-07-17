import { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import { ResizablePanel, ResizablePanelGroup } from '@/components/primitives/resizable';
import { CursorPagination } from '@/components/cursor-pagination';
import { RequestLog } from '../../types/logs';
import { LogsTableRow } from './logs-table-row';
import { LogsTableSkeletonRow } from './logs-table-skeleton-row';
import { LogsDetailPanel } from './logs-detail-panel';
import { LogsFilters } from './logs-filters';
import { useLogsUrlState } from '@/hooks/use-logs-url-state';
import { useFetchRequestLogs } from '@/hooks/use-fetch-request-logs';
import { RequestLogsEmptyState } from './logs-empty-state';

const refreshIcon = 'http://localhost:3845/assets/0aa94b2fb6d1e0194054478460d7cdfc289e265a.svg';

function UpdatedAgo({ lastUpdated, onRefresh }: { lastUpdated: Date; onRefresh: () => void }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update current time every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const timeAgo = useMemo(() => {
    const diffInSeconds = Math.floor((currentTime.getTime() - lastUpdated.getTime()) / 1000);

    if (diffInSeconds < 5) {
      return 'just now';
    } else if (diffInSeconds < 60) {
      // Round to nearest 5 seconds
      const roundedSeconds = Math.round(diffInSeconds / 5) * 5;
      return `${roundedSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
  }, [lastUpdated, currentTime]);

  return (
    <div className="flex items-center gap-1.5">
      <div className="text-xs font-medium leading-4">
        <span className="text-foreground-400">Updated </span>
        <span className="text-foreground-600">{timeAgo}</span>
      </div>
      <button
        onClick={async () => {
          setIsRefreshing(true);
          await onRefresh();
          setIsRefreshing(false);
        }}
        disabled={isRefreshing}
        className="flex items-center justify-center rounded-md bg-white p-1 transition-shadow hover:shadow-md disabled:opacity-50"
        title="Refresh data"
      >
        <div className="flex h-3.5 w-3.5 items-center justify-center p-0.5">
          <motion.img
            alt="Refresh"
            className="block h-full w-full max-w-none"
            src={refreshIcon}
            animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={{
              duration: 1,
              repeat: isRefreshing ? Infinity : 0,
              ease: 'linear',
            }}
          />
        </div>
      </button>
    </div>
  );
}

type LogsTableProps = {
  onLogClick?: (log: RequestLog) => void;
};

export function LogsTable({ onLogClick }: LogsTableProps) {
  const {
    selectedLogId,
    handleLogSelect,
    handleNext,
    handlePrevious,
    handleFirst,
    handleFiltersChange,
    clearFilters,
    hasActiveFilters,
    currentPage,
    limit,
    filters,
  } = useLogsUrlState();

  const {
    data: logsResponse,
    isLoading,
    refetch,
  } = useFetchRequestLogs({
    page: currentPage - 1, // API is 0-based
    limit: limit,
    status: filters.status,
    transactionId: filters.transactionId || undefined,
    created: filters.created?.toString(),
    url_pattern: filters.url_pattern || undefined,
  });

  const logsData = logsResponse?.data || [];
  const totalCount = logsResponse?.total || 0;

  // Track last updated time
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    if (logsResponse) {
      setLastUpdated(new Date());
    }
  }, [logsResponse]);

  const paginationState = useMemo(() => {
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / limit) : 1;
    const hasNext = totalCount > 0 && currentPage < totalPages;
    const hasPrevious = currentPage > 1;

    return { hasNext, hasPrevious, totalPages };
  }, [totalCount, limit, currentPage]);

  const selectedLog = selectedLogId ? logsData.find((log: RequestLog) => log.id === selectedLogId) : undefined;

  const handleRowClick = (log: RequestLog) => {
    const logId = log.id;
    handleLogSelect(logId);
    onLogClick?.(log);
  };

  const handleRefresh = async () => {
    await refetch();
    setLastUpdated(new Date());
  };

  if (!isLoading && logsData.length === 0 && !hasActiveFilters) {
    return <RequestLogsEmptyState />;
  }

  return (
    <div className="flex h-full flex-col p-2.5">
      <div className="flex items-center justify-between">
        <LogsFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
        <UpdatedAgo lastUpdated={lastUpdated} onRefresh={handleRefresh} />
      </div>

      <div className="relative flex h-full min-h-full flex-1 pt-2.5">
        <ResizablePanelGroup direction="horizontal" className="gap-2">
          <ResizablePanel defaultSize={50} minSize={50}>
            <div className="flex h-full flex-col">
              <div className="flex-1">
                <Table isLoading={isLoading} loadingRow={<LogsTableSkeletonRow />} loadingRowsCount={8}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-text-strong h-8 px-2 py-0">Requests</TableHead>
                      <TableHead className="h-8 w-[200px] px-2 py-0"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsData.map((log: RequestLog, index: number) => {
                      const logId = log.id;
                      return (
                        <LogsTableRow
                          key={logId}
                          log={log}
                          onClick={handleRowClick}
                          isSelected={selectedLogId === logId}
                        />
                      );
                    })}
                  </TableBody>
                </Table>
                {(paginationState.hasNext || paginationState.hasPrevious) && (
                  <CursorPagination
                    hasNext={paginationState.hasNext}
                    hasPrevious={paginationState.hasPrevious}
                    onNext={handleNext}
                    onPrevious={handlePrevious}
                    onFirst={handleFirst}
                  />
                )}
              </div>

              {!isLoading && logsData.length === 0 && hasActiveFilters && (
                <div className="flex flex-1 items-center justify-center">
                  <div className="text-center">
                    <p className="text-foreground-600 mb-2">No requests found matching your filters</p>
                    <button
                      onClick={clearFilters}
                      className="text-foreground-950 hover:text-foreground-600 text-sm font-medium underline"
                    >
                      Clear filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizablePanel defaultSize={50} minSize={35} maxSize={50}>
            <motion.div
              key={selectedLogId || 'empty'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="border-stroke-soft h-full overflow-auto rounded-lg border bg-white"
            >
              <LogsDetailPanel log={selectedLog} />
            </motion.div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
